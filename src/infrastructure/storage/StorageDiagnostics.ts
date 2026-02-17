import * as vscode from 'vscode';
import { SecretStorageProvider } from './SecretStorageProvider';
import { ConfigStorageProvider } from './ConfigStorageProvider';
import { SyncedStateProvider } from './SyncedStateProvider';
import { StorageMigrationService } from './StorageMigrationService';
import { Logger } from '../logging/Logger';

/**
 * Storage subsystem health status.
 */
export interface StorageHealthResult {
    secretStorage: boolean;
    configStorage: boolean;
    globalState: boolean;
    encryption: boolean;
}

/**
 * Aggregated diagnostics about storage state and key locations.
 */
export interface StorageDiagnosticsResult {
    migrationCompleted: boolean;
    openaiKeyLocations: string[];
    githubKeyLocations: string[];
    storageHealth: StorageHealthResult;
}

/**
 * Provides health check and diagnostic functionality for storage systems
 */
export class StorageDiagnostics {
    private readonly logger: Logger;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly secretStorage: SecretStorageProvider,
        private readonly syncedState: SyncedStateProvider,
        private readonly configStorage: ConfigStorageProvider,
        private readonly migrationService: StorageMigrationService,
    ) {
        this.logger = Logger.getInstance();
    }

    /**
     * Checks the health of storage systems
     */
    async checkStorageHealth(): Promise<StorageHealthResult> {
        const health: StorageHealthResult = {
            secretStorage: false,
            configStorage: false,
            globalState: false,
            encryption: false,
        };

        // Test SecretStorage
        try {
            const testKey = 'otak-committer.health-check';
            const testValue = 'test-' + Date.now();
            await this.context.secrets.store(testKey, testValue);
            const retrieved = await this.context.secrets.get(testKey);
            await this.context.secrets.delete(testKey);
            health.secretStorage = retrieved === testValue;
        } catch (error) {
            this.logger.error('[StorageManager] SecretStorage health check failed', error);
        }

        // Test Configuration
        try {
            const testKey = 'otak-committer.health-check';
            const testValue = 'test-' + Date.now();
            await this.configStorage.set(testKey, testValue);
            const retrieved = await this.configStorage.get(testKey);
            await this.configStorage.delete(testKey);
            health.configStorage = retrieved === testValue;
        } catch (error) {
            this.logger.error('[StorageManager] Configuration health check failed', error);
        }

        // Test GlobalState
        try {
            const testKey = 'otak-committer.health-check';
            const testValue = 'test-' + Date.now();
            await this.context.globalState.update(testKey, testValue);
            const retrieved = this.context.globalState.get<string>(testKey);
            await this.context.globalState.update(testKey, undefined);
            health.globalState = retrieved === testValue;
        } catch (error) {
            this.logger.error('[StorageManager] GlobalState health check failed', error);
        }

        // Test Encryption
        try {
            const { EncryptionUtil } = await import('../../utils/encryption');
            health.encryption = await EncryptionUtil.selfTest();
        } catch (error) {
            this.logger.error('[StorageManager] Encryption health check failed', error);
        }

        return health;
    }

    /**
     * Gets diagnostic information about storage state
     */
    async getStorageDiagnostics(): Promise<StorageDiagnosticsResult> {
        const diagnostics: StorageDiagnosticsResult = {
            migrationCompleted: this.migrationService.migrationCompleted,
            openaiKeyLocations: [],
            githubKeyLocations: [],
            storageHealth: await this.checkStorageHealth(),
        };

        // Check OpenAI key locations
        try {
            if (await this.secretStorage.has('openai.apiKey')) {
                diagnostics.openaiKeyLocations.push('SecretStorage');
            }
        } catch (error) {
            this.logger.error('[StorageManager] Error checking OpenAI key in SecretStorage', error);
        }

        try {
            if (this.syncedState.hasApiKey('openai')) {
                diagnostics.openaiKeyLocations.push('Settings Sync');
            }
        } catch (error) {
            this.logger.error('[StorageManager] Error checking OpenAI key in Settings Sync', error);
        }

        try {
            if (await this.configStorage.has('otakCommitter.openaiApiKey')) {
                diagnostics.openaiKeyLocations.push('Configuration (legacy)');
            }
        } catch (error) {
            this.logger.error('[StorageManager] Error checking OpenAI key in Configuration', error);
        }

        // Check GitHub key locations
        try {
            if (await this.secretStorage.has('github.apiKey')) {
                diagnostics.githubKeyLocations.push('SecretStorage');
            }
        } catch (error) {
            this.logger.error('[StorageManager] Error checking GitHub key in SecretStorage', error);
        }

        try {
            if (this.syncedState.hasApiKey('github')) {
                diagnostics.githubKeyLocations.push('Settings Sync');
            }
        } catch (error) {
            this.logger.error('[StorageManager] Error checking GitHub key in Settings Sync', error);
        }

        try {
            if (await this.configStorage.has('otakCommitter.githubToken')) {
                diagnostics.githubKeyLocations.push('Configuration (legacy)');
            }
        } catch (error) {
            this.logger.error('[StorageManager] Error checking GitHub key in Configuration', error);
        }

        return diagnostics;
    }
}
