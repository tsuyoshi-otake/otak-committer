import * as vscode from 'vscode';
import { StorageProvider } from './StorageProvider';
import { SecretStorageError } from '../../types/errors';
import { Logger } from '../logging/Logger';

/**
 * Storage provider implementation using VS Code's SecretStorage API
 *
 * Provides secure storage for sensitive data like API keys.
 *
 * @example
 * ```typescript
 * const provider = new SecretStorageProvider(context);
 * await provider.set('openai.apiKey', 'sk-...');
 * const key = await provider.get('openai.apiKey');
 * ```
 */
export class SecretStorageProvider implements StorageProvider {
    private static readonly LEGACY_BACKUP_PREFIX = 'otak-committer.backup.';
    private readonly logger: Logger;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.logger = Logger.getInstance();
    }

    /**
     * Retrieves a value from SecretStorage
     *
     * @param key - The storage key
     * @returns The stored value or undefined if not found
     * @throws {SecretStorageError} If retrieval fails critically
     */
    async get(key: string): Promise<string | undefined> {
        try {
            const value = await this.context.secrets.get(key);
            await this.deleteLegacyBackup(key);
            if (value && value.trim() !== '') {
                this.logger.debug(`[SecretStorageProvider] Retrieved value for key: ${key}`);
                return value;
            }
            return undefined;
        } catch (error) {
            this.logger.error(`[SecretStorageProvider] Error retrieving key ${key}:`, error);
            throw new SecretStorageError(`Failed to retrieve value for key: ${key}`, {
                key,
                originalError: error,
            });
        }
    }

    /**
     * Stores a value in SecretStorage
     *
     * @param key - The storage key
     * @param value - The value to store
     * @throws {SecretStorageError} If storage fails
     */
    async set(key: string, value: string): Promise<void> {
        try {
            if (!value || value.trim() === '') {
                await this.delete(key);
                return;
            }
            await this.context.secrets.store(key, value);
            await this.deleteLegacyBackup(key);

            this.logger.debug(`[SecretStorageProvider] Stored value for key: ${key}`);
        } catch (error) {
            this.logger.error(`[SecretStorageProvider] Error storing key ${key}:`, error);
            throw new SecretStorageError(`Failed to store value for key: ${key}`, {
                key,
                originalError: error,
            });
        }
    }

    /**
     * Deletes a value from SecretStorage
     *
     * @param key - The storage key
     * @throws {SecretStorageError} If deletion fails
     */
    async delete(key: string): Promise<void> {
        try {
            await this.context.secrets.delete(key);
            await this.deleteLegacyBackup(key);
            this.logger.debug(`[SecretStorageProvider] Deleted value for key: ${key}`);
        } catch (error) {
            this.logger.error(`[SecretStorageProvider] Error deleting key ${key}:`, error);
            await this.deleteLegacyBackup(key);
            throw new SecretStorageError(`Failed to delete value for key: ${key}`, {
                key,
                originalError: error,
            });
        }
    }

    /**
     * Checks if a key exists in SecretStorage
     *
     * @param key - The storage key
     * @returns True if the key exists, false otherwise
     */
    async has(key: string): Promise<boolean> {
        try {
            const value = await this.get(key);
            return value !== undefined && value.trim() !== '';
        } catch (error) {
            this.logger.error(`[SecretStorageProvider] Error checking key ${key}:`, error);
            return false;
        }
    }

    private async deleteLegacyBackup(key: string): Promise<void> {
        const backupKey = `${SecretStorageProvider.LEGACY_BACKUP_PREFIX}${key}`;
        try {
            await this.context.globalState.update(backupKey, undefined);
        } catch (error) {
            this.logger.warning(
                `[SecretStorageProvider] Failed to delete legacy backup for key: ${key}`,
                error,
            );
        }
    }
}
