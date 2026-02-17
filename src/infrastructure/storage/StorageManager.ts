import * as vscode from 'vscode';
import { SecretStorageProvider } from './SecretStorageProvider';
import { ConfigStorageProvider } from './ConfigStorageProvider';
import { SyncedStateProvider } from './SyncedStateProvider';
import { StorageMigrationService } from './StorageMigrationService';
import {
    StorageDiagnostics,
    StorageHealthResult,
    StorageDiagnosticsResult,
} from './StorageDiagnostics';
import { StorageError } from '../../types/errors';
import { ServiceProvider } from '../../types/enums/ServiceProvider';
import { Logger } from '../logging/Logger';
import { t } from '../../i18n';

/**
 * Unified storage manager for the extension
 *
 * Provides a single interface for all storage operations, abstracting
 * the underlying storage mechanisms (SecretStorage, Configuration, GlobalState).
 * Delegates migration and diagnostics to dedicated services.
 *
 * @example
 * ```typescript
 * const storage = new StorageManager(context);
 * await storage.setApiKey('openai', 'sk-...');
 * const key = await storage.getApiKey('openai');
 * ```
 */
export class StorageManager {
    private static readonly ALWAYS_STAGE_ALL_KEY = 'otak-committer.alwaysStageAll';

    private readonly context: vscode.ExtensionContext;
    private secretStorage: SecretStorageProvider;
    private syncedState: SyncedStateProvider;
    private configStorage: ConfigStorageProvider;
    private migrationService: StorageMigrationService;
    private diagnosticsService: StorageDiagnostics;
    private logger: Logger;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.secretStorage = new SecretStorageProvider(context);
        this.syncedState = new SyncedStateProvider(context);
        this.configStorage = new ConfigStorageProvider();
        this.logger = Logger.getInstance();
        this.migrationService = new StorageMigrationService(
            context,
            this.configStorage,
            (service, value) => this.setApiKey(service, value),
        );
        this.diagnosticsService = new StorageDiagnostics(
            context,
            this.secretStorage,
            this.syncedState,
            this.configStorage,
            this.migrationService,
        );

        this.registerKeysForSync();
    }

    private isApiKeySyncEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('otakCommitter');
        return config.get<boolean>('syncApiKeys') === true;
    }

    private setKeysForSync(keys: readonly string[]): void {
        const memento = this.context.globalState as vscode.Memento & {
            setKeysForSync?: (keys: readonly string[]) => void;
        };

        if (typeof memento.setKeysForSync !== 'function') {
            return;
        }

        try {
            memento.setKeysForSync(keys);
        } catch (error) {
            this.logger.warning(
                '[StorageManager] Failed to register keys for Settings Sync',
                error,
            );
        }
    }

    private registerKeysForSync(): void {
        const keys: string[] = [StorageManager.ALWAYS_STAGE_ALL_KEY];

        if (this.isApiKeySyncEnabled()) {
            keys.push(
                SyncedStateProvider.getApiKeyKey(ServiceProvider.OpenAI),
                SyncedStateProvider.getApiKeyKey(ServiceProvider.GitHub),
            );
        }

        this.setKeysForSync(keys);
    }

    /**
     * Configures VS Code Settings Sync integration.
     *
     * When `otakCommitter.syncApiKeys` is enabled, this:
     * - Registers sync keys via `setKeysForSync`
     * - Publishes existing SecretStorage API keys into synced extension state
     * - Restores synced keys into SecretStorage if missing locally
     */
    async configureSettingsSync(): Promise<void> {
        this.registerKeysForSync();

        if (!this.isApiKeySyncEnabled()) {
            return;
        }

        const services: ServiceProvider[] = [ServiceProvider.OpenAI, ServiceProvider.GitHub];
        for (const service of services) {
            const secretKey = `${service}.apiKey`;
            const localValue = (await this.secretStorage.get(secretKey))?.trim();

            if (localValue) {
                try {
                    await this.syncedState.setApiKey(service, localValue);
                } catch (error) {
                    this.logger.error(
                        `[StorageManager] Failed to publish ${service} API key to Settings Sync`,
                        error,
                    );
                }
                continue;
            }

            const syncedValue = this.syncedState.getApiKey(service)?.trim();
            if (!syncedValue) {
                continue;
            }

            // Best-effort restore to SecretStorage for secure local usage.
            this.logger.info(
                `[StorageManager] Restoring ${service} API key from Settings Sync to SecretStorage`,
            );

            try {
                await this.secretStorage.set(secretKey, syncedValue);
            } catch (error) {
                this.logger.error(
                    `[StorageManager] Failed to restore ${service} API key to SecretStorage`,
                    error,
                );
            }

            // Clean up legacy plaintext config if it exists.
            try {
                const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
                await this.configStorage.delete(legacyKey);
            } catch (error) {
                this.logger.error(
                    `[StorageManager] Failed to clean up legacy storage after Settings Sync restore`,
                    error,
                );
            }
        }
    }

    /**
     * Retrieves an API key for a service with fallback mechanisms
     *
     * Fallback chain:
     * 1. SecretStorage (primary)
     * 2. Encrypted GlobalState backup (automatic fallback in SecretStorageProvider)
     * 3. Settings Sync (optional, opt-in via configuration)
     * 4. Legacy Configuration storage (for migration scenarios)
     * 5. Returns undefined (graceful degradation)
     */
    async getApiKey(service: ServiceProvider): Promise<string | undefined> {
        try {
            const key = `${service}.apiKey`;

            const value = await this.secretStorage.get(key);
            if (value && value.trim() !== '') {
                return value;
            }

            if (this.isApiKeySyncEnabled()) {
                const syncedValue = this.syncedState.getApiKey(service);
                if (syncedValue && syncedValue.trim() !== '') {
                    // Best-effort restore to SecretStorage; ignore failures and still return the key.
                    try {
                        await this.secretStorage.set(key, syncedValue);
                    } catch (restoreError) {
                        this.logger.error(
                            `[StorageManager] Failed to restore ${service} API key from Settings Sync`,
                            restoreError,
                        );
                    }

                    return syncedValue;
                }
            }

            const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
            const legacyValue = await this.configStorage.get(legacyKey);

            if (legacyValue && legacyValue.trim() !== '') {
                this.logger.info(`Found API key in legacy storage for ${service}, migrating...`);

                try {
                    await this.setApiKey(service, legacyValue);
                    await this.configStorage.delete(legacyKey);
                    this.logger.info(`Successfully migrated ${service} API key`);
                } catch (migrationError) {
                    this.logger.error(`Failed to migrate ${service} key`, migrationError);
                }

                return legacyValue;
            }

            return undefined;
        } catch (error) {
            this.logger.error(`Error retrieving API key for ${service}`, error);

            if (this.isApiKeySyncEnabled()) {
                try {
                    const syncedValue = this.syncedState.getApiKey(service);
                    if (syncedValue && syncedValue.trim() !== '') {
                        this.logger.info(`Falling back to Settings Sync for ${service}`);
                        return syncedValue;
                    }
                } catch (syncFallbackError) {
                    this.logger.error(
                        `Settings Sync fallback retrieval also failed`,
                        syncFallbackError,
                    );
                }
            }

            try {
                const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
                const legacyValue = await this.configStorage.get(legacyKey);

                if (legacyValue && legacyValue.trim() !== '') {
                    this.logger.info(`Falling back to legacy storage for ${service}`);
                    return legacyValue;
                }
            } catch (fallbackError) {
                this.logger.error(`Fallback retrieval also failed`, fallbackError);
            }

            return undefined;
        }
    }

    /**
     * Stores an API key for a service with fallback mechanisms
     */
    async setApiKey(service: ServiceProvider, value: string): Promise<void> {
        try {
            const key = `${service}.apiKey`;
            await this.secretStorage.set(key, value);

            if (this.isApiKeySyncEnabled()) {
                try {
                    // Ensure keys are registered when toggled at runtime.
                    this.registerKeysForSync();
                    await this.syncedState.setApiKey(service, value);
                } catch (syncError) {
                    this.logger.error(
                        `[StorageManager] Failed to store ${service} API key in Settings Sync state`,
                        syncError,
                    );
                }
            }

            try {
                const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
                await this.configStorage.delete(legacyKey);
            } catch (cleanupError) {
                this.logger.error(`Failed to clean up legacy storage`, cleanupError);
            }
        } catch (error) {
            this.logger.error(`Error storing API key for ${service}`, error);

            if (this.isApiKeySyncEnabled()) {
                try {
                    this.registerKeysForSync();
                    await this.syncedState.setApiKey(service, value);
                } catch (syncError) {
                    this.logger.error(
                        `[StorageManager] Failed to store ${service} API key in Settings Sync state`,
                        syncError,
                    );
                }
            }

            try {
                const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
                await this.configStorage.set(legacyKey, value);
                this.logger.info(`Stored ${service} API key in legacy storage as fallback`);

                vscode.window.showWarningMessage(t('messages.storageFallbackWarning'));
            } catch (fallbackError) {
                this.logger.error(`Fallback storage also failed`, fallbackError);
                throw new StorageError(
                    `Failed to store API key for service: ${service}. All storage mechanisms failed.`,
                    { service, originalError: error, fallbackError },
                );
            }
        }
    }

    /**
     * Deletes an API key for a service from all storage locations
     */
    async deleteApiKey(service: ServiceProvider): Promise<void> {
        const errors: unknown[] = [];

        try {
            const key = `${service}.apiKey`;
            await this.secretStorage.delete(key);
        } catch (error) {
            this.logger.error(`Error deleting API key from SecretStorage for ${service}`, error);
            errors.push(error);
        }

        try {
            await this.syncedState.deleteApiKey(service);
        } catch (error) {
            this.logger.error(`Error deleting API key from Settings Sync for ${service}`, error);
            errors.push(error);
        }

        try {
            const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
            await this.configStorage.delete(legacyKey);
        } catch (error) {
            this.logger.error(`Error deleting API key from legacy storage for ${service}`, error);
            errors.push(error);
        }

        if (errors.length === 3) {
            throw new StorageError(
                `Failed to delete API key for service: ${service} from all storage locations`,
                {
                    service,
                    errors: errors.map((e) => (e instanceof Error ? e.message : String(e))),
                },
            );
        }

        if (errors.length > 0) {
            this.logger.info(`Partially deleted API key for ${service} (some locations failed)`);
        }
    }

    /**
     * Checks if an API key exists for a service in any storage location
     */
    async hasApiKey(service: ServiceProvider): Promise<boolean> {
        try {
            const key = `${service}.apiKey`;

            const hasInSecret = await this.secretStorage.has(key);
            if (hasInSecret) {
                return true;
            }

            if (this.isApiKeySyncEnabled() && this.syncedState.hasApiKey(service)) {
                return true;
            }

            const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
            return await this.configStorage.has(legacyKey);
        } catch (error) {
            this.logger.error(`Error checking API key for ${service}`, error);
            return false;
        }
    }

    /**
     * Migrates data from legacy Configuration storage to SecretStorage
     */
    async migrateFromLegacy(): Promise<void> {
        return this.migrationService.migrateFromLegacy();
    }

    /**
     * Gets a generic value from SecretStorage with fallback
     */
    async getSecret(key: string): Promise<string | undefined> {
        try {
            return await this.secretStorage.get(key);
        } catch (error) {
            this.logger.error(`Error retrieving secret for key ${key}`, error);
            return undefined;
        }
    }

    /**
     * Sets a generic value in SecretStorage with error handling
     */
    async setSecret(key: string, value: string): Promise<void> {
        try {
            await this.secretStorage.set(key, value);
        } catch (error) {
            this.logger.error(`Error storing secret for key ${key}`, error);
            throw new StorageError(`Failed to store secret for key: ${key}`, {
                key,
                originalError: error,
            });
        }
    }

    /**
     * Deletes a generic value from SecretStorage with error handling
     */
    async deleteSecret(key: string): Promise<void> {
        try {
            await this.secretStorage.delete(key);
        } catch (error) {
            this.logger.error(`Error deleting secret for key ${key}`, error);
        }
    }

    /**
     * Gets a configuration value with error handling
     */
    async getConfig(key: string): Promise<string | undefined> {
        try {
            return await this.configStorage.get(key);
        } catch (error) {
            this.logger.error(`Error retrieving config for key ${key}`, error);
            return undefined;
        }
    }

    /**
     * Sets a configuration value with error handling
     */
    async setConfig(
        key: string,
        value: string,
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
    ): Promise<void> {
        try {
            await this.configStorage.set(key, value, target);
        } catch (error) {
            this.logger.error(`Error storing config for key ${key}`, error);
            throw new StorageError(`Failed to store configuration for key: ${key}`, {
                key,
                originalError: error,
            });
        }
    }

    /**
     * Deletes a configuration value with error handling
     */
    async deleteConfig(key: string): Promise<void> {
        try {
            await this.configStorage.delete(key);
        } catch (error) {
            this.logger.error(`Error deleting config for key ${key}`, error);
        }
    }

    /**
     * Checks the health of storage systems
     */
    async checkStorageHealth(): Promise<StorageHealthResult> {
        return this.diagnosticsService.checkStorageHealth();
    }

    /**
     * Gets diagnostic information about storage state
     */
    async getStorageDiagnostics(): Promise<StorageDiagnosticsResult> {
        return this.diagnosticsService.getStorageDiagnostics();
    }
}
