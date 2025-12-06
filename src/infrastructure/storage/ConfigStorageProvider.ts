import * as vscode from 'vscode';
import { StorageProvider } from './StorageProvider';
import { ConfigurationError } from '../../types/errors';

/**
 * Storage provider implementation using VS Code's Configuration API
 * 
 * Provides storage for non-sensitive configuration data.
 * Note: This should NOT be used for sensitive data like API keys.
 * 
 * @example
 * ```typescript
 * const provider = new ConfigStorageProvider();
 * await provider.set('otakCommitter.language', 'japanese');
 * const language = await provider.get('otakCommitter.language');
 * ```
 */
export class ConfigStorageProvider implements StorageProvider {
    /**
     * Retrieves a value from Configuration
     * 
     * @param key - The configuration key (e.g., 'otakCommitter.language')
     * @returns The stored value or undefined if not found
     * @throws {ConfigurationError} If retrieval fails
     */
    async get(key: string): Promise<string | undefined> {
        try {
            const { section, property } = this.parseKey(key);
            const config = vscode.workspace.getConfiguration(section);
            const value = config.get<string>(property);
            
            if (value !== undefined) {
                console.log(`[ConfigStorageProvider] Retrieved value for key: ${key}`);
            }
            
            return value;
        } catch (error) {
            console.error(`[ConfigStorageProvider] Error retrieving key ${key}:`, error);
            throw new ConfigurationError(
                `Failed to retrieve configuration value for key: ${key}`,
                { key, originalError: error }
            );
        }
    }

    /**
     * Stores a value in Configuration
     * 
     * @param key - The configuration key (e.g., 'otakCommitter.language')
     * @param value - The value to store
     * @param target - The configuration target (defaults to Global)
     * @throws {ConfigurationError} If storage fails
     */
    async set(
        key: string,
        value: string,
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        try {
            const { section, property } = this.parseKey(key);
            const config = vscode.workspace.getConfiguration(section);
            await config.update(property, value, target);
            console.log(`[ConfigStorageProvider] Stored value for key: ${key}`);
        } catch (error) {
            console.error(`[ConfigStorageProvider] Error storing key ${key}:`, error);
            throw new ConfigurationError(
                `Failed to store configuration value for key: ${key}`,
                { key, value, originalError: error }
            );
        }
    }

    /**
     * Deletes a value from Configuration by setting it to undefined
     * 
     * @param key - The configuration key
     * @throws {ConfigurationError} If deletion fails
     */
    async delete(key: string): Promise<void> {
        try {
            const { section, property } = this.parseKey(key);
            const config = vscode.workspace.getConfiguration(section);
            
            // Clear from all configuration targets
            await Promise.all([
                config.update(property, undefined, vscode.ConfigurationTarget.Global),
                config.update(property, undefined, vscode.ConfigurationTarget.Workspace),
                config.update(property, undefined, vscode.ConfigurationTarget.WorkspaceFolder)
            ]);
            
            console.log(`[ConfigStorageProvider] Deleted value for key: ${key}`);
        } catch (error) {
            console.error(`[ConfigStorageProvider] Error deleting key ${key}:`, error);
            throw new ConfigurationError(
                `Failed to delete configuration value for key: ${key}`,
                { key, originalError: error }
            );
        }
    }

    /**
     * Checks if a key exists in Configuration
     * 
     * @param key - The configuration key
     * @returns True if the key exists and has a non-empty value, false otherwise
     */
    async has(key: string): Promise<boolean> {
        try {
            const value = await this.get(key);
            return value !== undefined && value.trim() !== '';
        } catch (error) {
            console.error(`[ConfigStorageProvider] Error checking key ${key}:`, error);
            return false;
        }
    }

    /**
     * Parses a configuration key into section and property
     * 
     * @param key - The full configuration key (e.g., 'otakCommitter.language')
     * @returns An object with section and property
     * 
     * @example
     * parseKey('otakCommitter.language') => { section: 'otakCommitter', property: 'language' }
     * parseKey('language') => { section: '', property: 'language' }
     */
    private parseKey(key: string): { section: string; property: string } {
        const lastDotIndex = key.lastIndexOf('.');
        
        if (lastDotIndex === -1) {
            // No dot found, treat entire key as property with empty section
            return { section: '', property: key };
        }
        
        return {
            section: key.substring(0, lastDotIndex),
            property: key.substring(lastDotIndex + 1)
        };
    }
}
