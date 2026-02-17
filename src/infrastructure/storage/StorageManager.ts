import * as vscode from 'vscode';
import { SecretStorageProvider } from './SecretStorageProvider';
import { ConfigStorageProvider } from './ConfigStorageProvider';
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
    private secretStorage: SecretStorageProvider;
    private configStorage: ConfigStorageProvider;
    private migrationService: StorageMigrationService;
    private diagnosticsService: StorageDiagnostics;
    private logger: Logger;

    constructor(context: vscode.ExtensionContext) {
        this.secretStorage = new SecretStorageProvider(context);
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
            this.configStorage,
            this.migrationService,
        );
    }

    /**
     * Retrieves an API key for a service with fallback mechanisms
     *
     * Fallback chain:
     * 1. SecretStorage (primary)
     * 2. Encrypted GlobalState backup (automatic fallback in SecretStorageProvider)
     * 3. Legacy Configuration storage (for migration scenarios)
     * 4. Returns undefined (graceful degradation)
     */
    async getApiKey(service: ServiceProvider): Promise<string | undefined> {
        try {
            const key = `${service}.apiKey`;

            const value = await this.secretStorage.get(key);
            if (value && value.trim() !== '') {
                return value;
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

            try {
                const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
                await this.configStorage.delete(legacyKey);
            } catch (cleanupError) {
                this.logger.error(`Failed to clean up legacy storage`, cleanupError);
            }
        } catch (error) {
            this.logger.error(`Error storing API key for ${service}`, error);

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
            const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
            await this.configStorage.delete(legacyKey);
        } catch (error) {
            this.logger.error(`Error deleting API key from legacy storage for ${service}`, error);
            errors.push(error);
        }

        if (errors.length === 2) {
            throw new StorageError(
                `Failed to delete API key for service: ${service} from all storage locations`,
                {
                    service,
                    errors: errors.map((e) => (e instanceof Error ? e.message : String(e))),
                },
            );
        }

        if (errors.length === 1) {
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
