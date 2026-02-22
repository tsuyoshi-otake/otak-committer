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
import { configureSettingsSync, registerKeysForSync } from './storageSync';
import {
    deleteApiKey as deleteApiKeyInternal,
    getApiKey as getApiKeyInternal,
    hasApiKey as hasApiKeyInternal,
    setApiKey as setApiKeyInternal,
} from './storageApiKey';

export class StorageManager {
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

    private registerKeysForSync(): void {
        registerKeysForSync(this.context, this.logger);
    }

    async configureSettingsSync(): Promise<void> {
        await configureSettingsSync(
            this.context,
            this.secretStorage,
            this.syncedState,
            this.configStorage,
            this.logger,
        );
    }

    async getApiKey(service: ServiceProvider): Promise<string | undefined> {
        return getApiKeyInternal(
            {
                secretStorage: this.secretStorage,
                syncedState: this.syncedState,
                configStorage: this.configStorage,
                logger: this.logger,
                registerKeysForSync: () => this.registerKeysForSync(),
            },
            service,
        );
    }

    async setApiKey(service: ServiceProvider, value: string): Promise<void> {
        await setApiKeyInternal(
            {
                secretStorage: this.secretStorage,
                syncedState: this.syncedState,
                configStorage: this.configStorage,
                logger: this.logger,
                registerKeysForSync: () => this.registerKeysForSync(),
            },
            service,
            value,
        );
    }

    async deleteApiKey(service: ServiceProvider): Promise<void> {
        await deleteApiKeyInternal(
            {
                secretStorage: this.secretStorage,
                syncedState: this.syncedState,
                configStorage: this.configStorage,
                logger: this.logger,
                registerKeysForSync: () => this.registerKeysForSync(),
            },
            service,
        );
    }

    async hasApiKey(service: ServiceProvider): Promise<boolean> {
        return hasApiKeyInternal(
            {
                secretStorage: this.secretStorage,
                syncedState: this.syncedState,
                configStorage: this.configStorage,
                logger: this.logger,
                registerKeysForSync: () => this.registerKeysForSync(),
            },
            service,
        );
    }

    async migrateFromLegacy(): Promise<void> {
        return this.migrationService.migrateFromLegacy();
    }

    async getSecret(key: string): Promise<string | undefined> {
        try {
            return await this.secretStorage.get(key);
        } catch (error) {
            this.logger.error(`Error retrieving secret for key ${key}`, error);
            return undefined;
        }
    }

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

    async deleteSecret(key: string): Promise<void> {
        try {
            await this.secretStorage.delete(key);
        } catch (error) {
            this.logger.error(`Error deleting secret for key ${key}`, error);
        }
    }

    async getConfig(key: string): Promise<string | undefined> {
        try {
            return await this.configStorage.get(key);
        } catch (error) {
            this.logger.error(`Error retrieving config for key ${key}`, error);
            return undefined;
        }
    }

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

    async deleteConfig(key: string): Promise<void> {
        try {
            await this.configStorage.delete(key);
        } catch (error) {
            this.logger.error(`Error deleting config for key ${key}`, error);
        }
    }

    async checkStorageHealth(): Promise<StorageHealthResult> {
        return this.diagnosticsService.checkStorageHealth();
    }

    async getStorageDiagnostics(): Promise<StorageDiagnosticsResult> {
        return this.diagnosticsService.getStorageDiagnostics();
    }
}
