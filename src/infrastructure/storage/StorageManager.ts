import * as vscode from 'vscode';
import { SecretStorageProvider } from './SecretStorageProvider';
import { ConfigStorageProvider } from './ConfigStorageProvider';
import { StorageError } from '../../types/errors';

/**
 * Unified storage manager for the extension
 * 
 * Provides a single interface for all storage operations, abstracting
 * the underlying storage mechanisms (SecretStorage, Configuration, GlobalState).
 * Handles migration from legacy storage formats and provides fallback mechanisms.
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
    private static readonly MIGRATION_FLAG_KEY = 'otak-committer.migrationCompleted';

    constructor(private readonly context: vscode.ExtensionContext) {
        this.secretStorage = new SecretStorageProvider(context);
        this.configStorage = new ConfigStorageProvider();
    }

    /**
     * Retrieves an API key for a service with fallback mechanisms
     * 
     * Fallback chain:
     * 1. SecretStorage (primary)
     * 2. Encrypted GlobalState backup (automatic fallback in SecretStorageProvider)
     * 3. Legacy Configuration storage (for migration scenarios)
     * 4. Returns undefined (graceful degradation)
     * 
     * @param service - The service name ('openai' or 'github')
     * @returns The API key or undefined if not found
     * 
     * @example
     * ```typescript
     * const openaiKey = await storage.getApiKey('openai');
     * const githubToken = await storage.getApiKey('github');
     * ```
     */
    async getApiKey(service: 'openai' | 'github'): Promise<string | undefined> {
        try {
            const key = `${service}.apiKey`;
            
            // Try primary storage (SecretStorage with automatic backup fallback)
            const value = await this.secretStorage.get(key);
            if (value && value.trim() !== '') {
                return value;
            }

            // Fallback to legacy configuration storage (for migration scenarios)
            const legacyKey = this.getLegacyConfigKey(service);
            const legacyValue = await this.configStorage.get(legacyKey);
            
            if (legacyValue && legacyValue.trim() !== '') {
                console.log(`[StorageManager] Found API key in legacy storage for ${service}, migrating...`);
                
                // Attempt to migrate to new storage
                try {
                    await this.setApiKey(service, legacyValue);
                    await this.configStorage.delete(legacyKey);
                    console.log(`[StorageManager] Successfully migrated ${service} API key`);
                } catch (migrationError) {
                    console.error(`[StorageManager] Failed to migrate ${service} key:`, migrationError);
                    // Continue using legacy value even if migration fails
                }
                
                return legacyValue;
            }

            // No API key found in any storage location
            return undefined;
        } catch (error) {
            console.error(`[StorageManager] Error retrieving API key for ${service}:`, error);
            
            // Graceful degradation: try legacy storage as last resort
            try {
                const legacyKey = this.getLegacyConfigKey(service);
                const legacyValue = await this.configStorage.get(legacyKey);
                
                if (legacyValue && legacyValue.trim() !== '') {
                    console.log(`[StorageManager] Falling back to legacy storage for ${service}`);
                    return legacyValue;
                }
            } catch (fallbackError) {
                console.error(`[StorageManager] Fallback retrieval also failed:`, fallbackError);
            }
            
            // Return undefined instead of throwing to allow graceful degradation
            return undefined;
        }
    }

    /**
     * Stores an API key for a service with fallback mechanisms
     * 
     * Storage strategy:
     * 1. Store in SecretStorage (primary)
     * 2. Store encrypted backup in GlobalState (automatic in SecretStorageProvider)
     * 3. If both fail, attempt to store in legacy Configuration as last resort
     * 
     * @param service - The service name ('openai' or 'github')
     * @param value - The API key to store
     * @throws {StorageError} If all storage attempts fail
     * 
     * @example
     * ```typescript
     * await storage.setApiKey('openai', 'sk-...');
     * await storage.setApiKey('github', 'ghp_...');
     * ```
     */
    async setApiKey(service: 'openai' | 'github', value: string): Promise<void> {
        try {
            const key = `${service}.apiKey`;
            
            // Try primary storage (SecretStorage with automatic backup)
            await this.secretStorage.set(key, value);
            
            // Clean up any legacy storage
            try {
                const legacyKey = this.getLegacyConfigKey(service);
                await this.configStorage.delete(legacyKey);
            } catch (cleanupError) {
                console.error(`[StorageManager] Failed to clean up legacy storage:`, cleanupError);
                // Non-critical error, continue
            }
        } catch (error) {
            console.error(`[StorageManager] Error storing API key for ${service}:`, error);
            
            // Fallback: try to store in legacy configuration as last resort
            try {
                const legacyKey = this.getLegacyConfigKey(service);
                await this.configStorage.set(legacyKey, value);
                console.log(`[StorageManager] Stored ${service} API key in legacy storage as fallback`);
                
                // Show warning to user
                vscode.window.showWarningMessage(
                    `otak-committer: API key stored in fallback storage. Secure storage is unavailable.`
                );
            } catch (fallbackError) {
                console.error(`[StorageManager] Fallback storage also failed:`, fallbackError);
                throw new StorageError(
                    `Failed to store API key for service: ${service}. All storage mechanisms failed.`,
                    { service, originalError: error, fallbackError }
                );
            }
        }
    }

    /**
     * Deletes an API key for a service from all storage locations
     * 
     * Deletes from:
     * 1. SecretStorage (primary)
     * 2. Encrypted GlobalState backup (automatic in SecretStorageProvider)
     * 3. Legacy Configuration storage (cleanup)
     * 
     * @param service - The service name ('openai' or 'github')
     * 
     * @example
     * ```typescript
     * await storage.deleteApiKey('openai');
     * ```
     */
    async deleteApiKey(service: 'openai' | 'github'): Promise<void> {
        const errors: Error[] = [];
        
        try {
            const key = `${service}.apiKey`;
            await this.secretStorage.delete(key);
        } catch (error) {
            console.error(`[StorageManager] Error deleting API key from SecretStorage for ${service}:`, error);
            errors.push(error as Error);
        }
        
        // Also try to delete from legacy storage
        try {
            const legacyKey = this.getLegacyConfigKey(service);
            await this.configStorage.delete(legacyKey);
        } catch (error) {
            console.error(`[StorageManager] Error deleting API key from legacy storage for ${service}:`, error);
            errors.push(error as Error);
        }
        
        // If deletion failed from all locations, throw error
        if (errors.length === 2) {
            throw new StorageError(
                `Failed to delete API key for service: ${service} from all storage locations`,
                { service, errors: errors.map(e => e.message) }
            );
        }
        
        // If at least one deletion succeeded, consider it successful
        if (errors.length === 1) {
            console.log(`[StorageManager] Partially deleted API key for ${service} (some locations failed)`);
        }
    }

    /**
     * Checks if an API key exists for a service in any storage location
     * 
     * Checks:
     * 1. SecretStorage (primary)
     * 2. Encrypted GlobalState backup (automatic in SecretStorageProvider)
     * 3. Legacy Configuration storage
     * 
     * @param service - The service name ('openai' or 'github')
     * @returns True if the API key exists in any location, false otherwise
     * 
     * @example
     * ```typescript
     * if (await storage.hasApiKey('openai')) {
     *   // API key is configured
     * }
     * ```
     */
    async hasApiKey(service: 'openai' | 'github'): Promise<boolean> {
        try {
            const key = `${service}.apiKey`;
            
            // Check primary storage
            const hasInSecret = await this.secretStorage.has(key);
            if (hasInSecret) {
                return true;
            }
            
            // Check legacy storage as fallback
            const legacyKey = this.getLegacyConfigKey(service);
            const hasInLegacy = await this.configStorage.has(legacyKey);
            
            return hasInLegacy;
        } catch (error) {
            console.error(`[StorageManager] Error checking API key for ${service}:`, error);
            // Graceful degradation: return false instead of throwing
            return false;
        }
    }

    /**
     * Migrates data from legacy Configuration storage to SecretStorage
     * 
     * This method automatically runs during extension activation to migrate
     * API keys from the old plain-text Configuration storage to the new
     * encrypted SecretStorage.
     * 
     * @returns A promise that resolves when migration is complete
     * 
     * @example
     * ```typescript
     * await storage.migrateFromLegacy();
     * ```
     */
    async migrateFromLegacy(): Promise<void> {
        try {
            // Check if migration has already been completed
            const migrationCompleted = this.context.globalState.get<boolean>(
                StorageManager.MIGRATION_FLAG_KEY
            );

            if (migrationCompleted) {
                console.log('[StorageManager] Migration already completed, skipping');
                return;
            }

            console.log('[StorageManager] Starting legacy data migration...');

            // Migrate OpenAI API Key
            await this.migrateLegacyKey('openai', 'otakCommitter.openaiApiKey');

            // Migrate GitHub Token (if it exists in old format)
            await this.migrateLegacyKey('github', 'otakCommitter.githubToken');

            // Mark migration as completed
            await this.context.globalState.update(StorageManager.MIGRATION_FLAG_KEY, true);

            console.log('[StorageManager] Legacy data migration completed');

            // Show notification to user
            vscode.window.showInformationMessage(
                'otak-committer: API keys have been migrated to secure storage.'
            );
        } catch (error) {
            console.error('[StorageManager] Migration failed:', error);
            // Don't throw - allow extension to continue loading
            // Migration will be retried on next activation
        }
    }

    /**
     * Migrates a single legacy key from Configuration to SecretStorage with fallback
     * 
     * @param service - The service name
     * @param legacyConfigKey - The old configuration key
     */
    private async migrateLegacyKey(
        service: 'openai' | 'github',
        legacyConfigKey: string
    ): Promise<void> {
        try {
            // Check if key exists in legacy storage
            const legacyValue = await this.configStorage.get(legacyConfigKey);

            if (legacyValue && legacyValue.trim() !== '') {
                console.log(`[StorageManager] Migrating ${service} API key from legacy storage`);

                try {
                    // Store in new SecretStorage
                    await this.setApiKey(service, legacyValue);

                    // Clear from legacy Configuration storage
                    await this.configStorage.delete(legacyConfigKey);

                    console.log(`[StorageManager] Successfully migrated ${service} API key`);
                } catch (migrationError) {
                    console.error(`[StorageManager] Failed to migrate ${service} key:`, migrationError);
                    
                    // Fallback: Leave the key in legacy storage if migration fails
                    // This ensures the user doesn't lose their API key
                    console.log(`[StorageManager] Keeping ${service} API key in legacy storage as fallback`);
                    
                    vscode.window.showWarningMessage(
                        `otak-committer: Failed to migrate ${service} API key to secure storage. Using fallback storage.`
                    );
                }
            }
        } catch (error) {
            console.error(`[StorageManager] Failed to check/migrate ${service} key:`, error);
            // Continue with other migrations even if one fails
        }
    }

    /**
     * Gets the legacy configuration key for a service
     * 
     * @param service - The service name
     * @returns The legacy configuration key
     */
    private getLegacyConfigKey(service: 'openai' | 'github'): string {
        switch (service) {
            case 'openai':
                return 'otakCommitter.openaiApiKey';
            case 'github':
                return 'otakCommitter.githubToken';
            default:
                return `otakCommitter.${service}ApiKey`;
        }
    }

    /**
     * Gets a generic value from SecretStorage with fallback
     * 
     * @param key - The storage key
     * @returns The stored value or undefined if not found
     */
    async getSecret(key: string): Promise<string | undefined> {
        try {
            return await this.secretStorage.get(key);
        } catch (error) {
            console.error(`[StorageManager] Error retrieving secret for key ${key}:`, error);
            // Graceful degradation: return undefined instead of throwing
            return undefined;
        }
    }

    /**
     * Sets a generic value in SecretStorage with error handling
     * 
     * @param key - The storage key
     * @param value - The value to store
     * @throws {StorageError} If storage fails
     */
    async setSecret(key: string, value: string): Promise<void> {
        try {
            await this.secretStorage.set(key, value);
        } catch (error) {
            console.error(`[StorageManager] Error storing secret for key ${key}:`, error);
            throw new StorageError(
                `Failed to store secret for key: ${key}`,
                { key, originalError: error }
            );
        }
    }

    /**
     * Deletes a generic value from SecretStorage with error handling
     * 
     * @param key - The storage key
     */
    async deleteSecret(key: string): Promise<void> {
        try {
            await this.secretStorage.delete(key);
        } catch (error) {
            console.error(`[StorageManager] Error deleting secret for key ${key}:`, error);
            // Don't throw - deletion failure is not critical
            // The value will be overwritten if set again
        }
    }

    /**
     * Gets a configuration value with error handling
     * 
     * @param key - The configuration key
     * @returns The configuration value or undefined if not found
     */
    async getConfig(key: string): Promise<string | undefined> {
        try {
            return await this.configStorage.get(key);
        } catch (error) {
            console.error(`[StorageManager] Error retrieving config for key ${key}:`, error);
            // Graceful degradation: return undefined instead of throwing
            return undefined;
        }
    }

    /**
     * Sets a configuration value with error handling
     * 
     * @param key - The configuration key
     * @param value - The value to store
     * @param target - The configuration target
     * @throws {StorageError} If storage fails
     */
    async setConfig(
        key: string,
        value: string,
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        try {
            await this.configStorage.set(key, value, target);
        } catch (error) {
            console.error(`[StorageManager] Error storing config for key ${key}:`, error);
            throw new StorageError(
                `Failed to store configuration for key: ${key}`,
                { key, originalError: error }
            );
        }
    }

    /**
     * Deletes a configuration value with error handling
     * 
     * @param key - The configuration key
     */
    async deleteConfig(key: string): Promise<void> {
        try {
            await this.configStorage.delete(key);
        } catch (error) {
            console.error(`[StorageManager] Error deleting config for key ${key}:`, error);
            // Don't throw - deletion failure is not critical
        }
    }

    /**
     * Checks the health of storage systems
     * 
     * Tests all storage mechanisms to ensure they are functioning correctly.
     * Useful for diagnostics and troubleshooting.
     * 
     * @returns An object with health status for each storage mechanism
     * 
     * @example
     * ```typescript
     * const health = await storage.checkStorageHealth();
     * if (!health.secretStorage) {
     *   console.warn('SecretStorage is not available');
     * }
     * ```
     */
    async checkStorageHealth(): Promise<{
        secretStorage: boolean;
        configStorage: boolean;
        globalState: boolean;
        encryption: boolean;
    }> {
        const health = {
            secretStorage: false,
            configStorage: false,
            globalState: false,
            encryption: false
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
            console.error('[StorageManager] SecretStorage health check failed:', error);
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
            console.error('[StorageManager] Configuration health check failed:', error);
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
            console.error('[StorageManager] GlobalState health check failed:', error);
        }

        // Test Encryption
        try {
            const { EncryptionUtil } = await import('../../utils/encryption');
            health.encryption = await EncryptionUtil.selfTest();
        } catch (error) {
            console.error('[StorageManager] Encryption health check failed:', error);
        }

        return health;
    }

    /**
     * Gets diagnostic information about storage state
     * 
     * Provides detailed information about what data is stored where,
     * useful for debugging storage issues.
     * 
     * @returns Diagnostic information about storage state
     */
    async getStorageDiagnostics(): Promise<{
        migrationCompleted: boolean;
        openaiKeyLocations: string[];
        githubKeyLocations: string[];
        storageHealth: {
            secretStorage: boolean;
            configStorage: boolean;
            globalState: boolean;
            encryption: boolean;
        };
    }> {
        const diagnostics = {
            migrationCompleted: false,
            openaiKeyLocations: [] as string[],
            githubKeyLocations: [] as string[],
            storageHealth: await this.checkStorageHealth()
        };

        // Check migration status
        diagnostics.migrationCompleted = this.context.globalState.get<boolean>(
            StorageManager.MIGRATION_FLAG_KEY
        ) ?? false;

        // Check OpenAI key locations
        try {
            if (await this.secretStorage.has('openai.apiKey')) {
                diagnostics.openaiKeyLocations.push('SecretStorage');
            }
        } catch (error) {
            console.error('[StorageManager] Error checking OpenAI key in SecretStorage:', error);
        }

        try {
            if (await this.configStorage.has('otakCommitter.openaiApiKey')) {
                diagnostics.openaiKeyLocations.push('Configuration (legacy)');
            }
        } catch (error) {
            console.error('[StorageManager] Error checking OpenAI key in Configuration:', error);
        }

        // Check GitHub key locations
        try {
            if (await this.secretStorage.has('github.apiKey')) {
                diagnostics.githubKeyLocations.push('SecretStorage');
            }
        } catch (error) {
            console.error('[StorageManager] Error checking GitHub key in SecretStorage:', error);
        }

        try {
            if (await this.configStorage.has('otakCommitter.githubToken')) {
                diagnostics.githubKeyLocations.push('Configuration (legacy)');
            }
        } catch (error) {
            console.error('[StorageManager] Error checking GitHub key in Configuration:', error);
        }

        return diagnostics;
    }
}
