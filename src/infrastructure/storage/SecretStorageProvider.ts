import * as vscode from 'vscode';
import { StorageProvider } from './StorageProvider';
import { SecretStorageError } from '../../types/errors';
import { EncryptionUtil } from '../../utils/encryption';
import { Logger } from '../logging/Logger';

/**
 * Storage provider implementation using VS Code's SecretStorage API
 * 
 * Provides secure storage for sensitive data like API keys with
 * encrypted fallback to GlobalState for reliability.
 * 
 * @example
 * ```typescript
 * const provider = new SecretStorageProvider(context);
 * await provider.set('openai.apiKey', 'sk-...');
 * const key = await provider.get('openai.apiKey');
 * ```
 */
export class SecretStorageProvider implements StorageProvider {
    private static readonly BACKUP_PREFIX = 'otak-committer.backup.';
    private readonly logger: Logger;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.logger = Logger.getInstance();
    }

    /**
     * Retrieves a value from SecretStorage with encrypted fallback
     * 
     * @param key - The storage key
     * @returns The stored value or undefined if not found
     * @throws {SecretStorageError} If retrieval fails critically
     */
    async get(key: string): Promise<string | undefined> {
        try {
            // Try SecretStorage first
            const value = await this.context.secrets.get(key);
            if (value && value.trim() !== '') {
                this.logger.debug(`[SecretStorageProvider] Retrieved value for key: ${key}`);
                return value;
            }

            // Fallback to encrypted backup in GlobalState
            return await this.getFromBackup(key);
        } catch (error) {
            this.logger.error(`[SecretStorageProvider] Error retrieving key ${key}:`, error);
            // Try backup as fallback
            try {
                return await this.getFromBackup(key);
            } catch (backupError) {
                throw new SecretStorageError(
                    `Failed to retrieve value for key: ${key}`,
                    { key, originalError: error }
                );
            }
        }
    }

    /**
     * Stores a value in SecretStorage with encrypted backup
     * 
     * @param key - The storage key
     * @param value - The value to store
     * @throws {SecretStorageError} If storage fails
     */
    async set(key: string, value: string): Promise<void> {
        try {
            const encryptedValue = EncryptionUtil.encrypt(value);

            // Store sequentially: primary first, then backup
            await this.context.secrets.store(key, value);
            await this.setBackup(key, encryptedValue);

            this.logger.debug(`[SecretStorageProvider] Stored value for key: ${key}`);
        } catch (error) {
            this.logger.error(`[SecretStorageProvider] Error storing key ${key}:`, error);

            // At least try to save encrypted to GlobalState
            try {
                const encryptedValue = EncryptionUtil.encrypt(value);
                await this.setBackup(key, encryptedValue);
                this.logger.debug(`[SecretStorageProvider] Stored value in backup only for key: ${key}`);
            } catch (backupError) {
                throw new SecretStorageError(
                    `Failed to store value for key: ${key}`,
                    { key, originalError: error, backupError }
                );
            }
        }
    }

    /**
     * Deletes a value from SecretStorage and backup
     * 
     * @param key - The storage key
     * @throws {SecretStorageError} If deletion fails
     */
    async delete(key: string): Promise<void> {
        try {
            // Delete sequentially: primary first, then backup
            await this.context.secrets.delete(key);
            await this.deleteBackup(key);
            this.logger.debug(`[SecretStorageProvider] Deleted value for key: ${key}`);
        } catch (error) {
            this.logger.error(`[SecretStorageProvider] Error deleting key ${key}:`, error);
            // Try to delete from at least one location
            try {
                await this.deleteBackup(key);
            } catch (backupError) {
                throw new SecretStorageError(
                    `Failed to delete value for key: ${key}`,
                    { key, originalError: error }
                );
            }
        }
    }

    /**
     * Checks if a key exists in SecretStorage or backup
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

    /**
     * Retrieves a value from encrypted backup in GlobalState
     * 
     * @param key - The storage key
     * @returns The decrypted value or undefined if not found
     */
    async getFromBackup(key: string): Promise<string | undefined> {
        const backupKey = this.getBackupKey(key);
        const encryptedValue = this.context.globalState.get<string>(backupKey);

        if (!encryptedValue || encryptedValue.trim() === '') {
            return undefined;
        }

        try {
            const decryptedValue = EncryptionUtil.decrypt(encryptedValue);
            this.logger.debug(`[SecretStorageProvider] Retrieved value from backup for key: ${key}`);

            // Try to restore to SecretStorage
            try {
                await this.context.secrets.store(key, decryptedValue);
                this.logger.debug(`[SecretStorageProvider] Restored value to SecretStorage for key: ${key}`);
            } catch (restoreError) {
                this.logger.error(`[SecretStorageProvider] Failed to restore to SecretStorage:`, restoreError);
            }

            return decryptedValue;
        } catch (decryptError) {
            this.logger.error(`[SecretStorageProvider] Failed to decrypt backup for key ${key}:`, decryptError);
            // Clear corrupted backup
            await this.deleteBackup(key);
            return undefined;
        }
    }

    /**
     * Stores an encrypted value in GlobalState backup
     * 
     * @param key - The storage key
     * @param encryptedValue - The encrypted value to store
     */
    private async setBackup(key: string, encryptedValue: string): Promise<void> {
        const backupKey = this.getBackupKey(key);
        await this.context.globalState.update(backupKey, encryptedValue);
    }

    /**
     * Deletes a value from GlobalState backup
     * 
     * @param key - The storage key
     */
    private async deleteBackup(key: string): Promise<void> {
        const backupKey = this.getBackupKey(key);
        await this.context.globalState.update(backupKey, undefined);
    }

    /**
     * Generates a backup key for GlobalState storage
     * 
     * @param key - The original storage key
     * @returns The backup key
     */
    private getBackupKey(key: string): string {
        return `${SecretStorageProvider.BACKUP_PREFIX}${key}`;
    }
}
