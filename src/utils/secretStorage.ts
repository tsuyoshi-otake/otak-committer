import * as vscode from 'vscode';
import { EncryptionUtil } from './encryption';

/**
 * Manages API keys using VS Code's SecretStorage API for secure storage
 * Implements encrypted fallback mechanisms for environments where SecretStorage may be unreliable
 */
export class SecretStorageManager {
    private static instance: SecretStorageManager | undefined;
    private context: vscode.ExtensionContext;
    private static readonly GLOBAL_STATE_KEY = 'otak-committer.openaiApiKey.backup';
    private static readonly SECRET_KEY = 'otak-committer.openaiApiKey';

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.logEnvironmentInfo();
    }

    /**
     * Log environment information for debugging
     */
    private logEnvironmentInfo(): void {
        console.log('[SecretStorage] Environment info:', {
            isWSL: process.platform === 'linux' && process.env.WSL_DISTRO_NAME,
            isRemote: this.context.extension.extensionKind === vscode.ExtensionKind.Workspace,
            platform: process.platform,
            vscodeVersion: vscode.version,
            extensionMode: this.context.extensionMode
        });
    }

    /**
     * Initialize the SecretStorageManager singleton
     */
    static initialize(context: vscode.ExtensionContext): SecretStorageManager {
        if (!SecretStorageManager.instance) {
            SecretStorageManager.instance = new SecretStorageManager(context);
        }
        return SecretStorageManager.instance;
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): SecretStorageManager {
        if (!SecretStorageManager.instance) {
            throw new Error('SecretStorageManager not initialized. Call initialize() first.');
        }
        return SecretStorageManager.instance;
    }

    /**
     * Migrate API keys from Configuration API to SecretStorage
     * This runs automatically on extension activation
     */
    async migrateFromConfiguration(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('otakCommitter');

            // Migrate OpenAI API Key
            const openaiKey = config.get<string>('openaiApiKey');
            if (openaiKey && openaiKey.trim() !== '') {
                console.log('Migrating OpenAI API key from configuration to secure storage...');
                await this.setOpenAIApiKey(openaiKey);

                // Clear from configuration by setting to empty string
                // VS Code doesn't properly clear deprecated settings with undefined
                try {
                    await config.update('openaiApiKey', '', vscode.ConfigurationTarget.Global);
                    console.log('Cleared API key from global configuration');
                } catch (e) {
                    console.error('Failed to clear global config:', e);
                }

                try {
                    await config.update('openaiApiKey', '', vscode.ConfigurationTarget.Workspace);
                    console.log('Cleared API key from workspace configuration');
                } catch (e) {
                    console.error('Failed to clear workspace config:', e);
                }

                console.log('OpenAI API key migration completed');
                vscode.window.showInformationMessage('OpenAI API key has been migrated to secure storage. The old setting has been cleared.');
            }
        } catch (error) {
            console.error('Failed to migrate API key:', error);
            // Don't throw - allow extension to continue loading
        }
    }

    /**
     * Get OpenAI API Key from secure storage with encrypted fallback
     */
    async getOpenAIApiKey(): Promise<string | undefined> {
        try {
            // Try to get from SecretStorage first
            const secretKey = await this.context.secrets.get(SecretStorageManager.SECRET_KEY);
            if (secretKey && secretKey.trim() !== '') {
                console.log('[SecretStorage] API key retrieved from SecretStorage');
                return secretKey;
            }

            // Fallback to global state (encrypted backup)
            const encryptedBackup = this.context.globalState.get<string>(SecretStorageManager.GLOBAL_STATE_KEY);
            if (encryptedBackup && encryptedBackup.trim() !== '') {
                console.log('[SecretStorage] Encrypted API key found in backup storage');

                try {
                    // Decrypt the backup
                    const decryptedKey = EncryptionUtil.decrypt(encryptedBackup);
                    console.log('[SecretStorage] API key successfully decrypted from backup');

                    // Try to restore to SecretStorage
                    try {
                        await this.context.secrets.store(SecretStorageManager.SECRET_KEY, decryptedKey);
                        console.log('[SecretStorage] API key restored to SecretStorage');
                    } catch (error) {
                        console.error('[SecretStorage] Failed to restore to SecretStorage:', error);
                    }

                    return decryptedKey;
                } catch (decryptError) {
                    console.error('[SecretStorage] Failed to decrypt backup:', decryptError);
                    // If decryption fails, the backup might be corrupted
                    // Clear it to avoid repeated errors
                    await this.context.globalState.update(SecretStorageManager.GLOBAL_STATE_KEY, undefined);
                    console.log('[SecretStorage] Cleared corrupted backup');
                }
            }

            console.log('[SecretStorage] No API key found in any storage');
            return undefined;
        } catch (error) {
            console.error('[SecretStorage] Error retrieving API key:', error);
            return undefined;
        }
    }

    /**
     * Set OpenAI API Key in secure storage with encrypted backup
     */
    async setOpenAIApiKey(value: string): Promise<void> {
        try {
            // Encrypt the API key for backup
            const encryptedValue = EncryptionUtil.encrypt(value);

            // Store in both SecretStorage and encrypted global state for redundancy
            await Promise.all([
                this.context.secrets.store(SecretStorageManager.SECRET_KEY, value),
                this.context.globalState.update(SecretStorageManager.GLOBAL_STATE_KEY, encryptedValue)
            ]);
            console.log('[SecretStorage] API key stored in SecretStorage and encrypted backup');
        } catch (error) {
            console.error('[SecretStorage] Error storing API key:', error);

            // At least try to save encrypted to global state
            try {
                const encryptedValue = EncryptionUtil.encrypt(value);
                await this.context.globalState.update(SecretStorageManager.GLOBAL_STATE_KEY, encryptedValue);
                console.log('[SecretStorage] API key stored in encrypted backup only due to error');
            } catch (encryptError) {
                console.error('[SecretStorage] Failed to store encrypted backup:', encryptError);
            }

            throw error;
        }
    }

    /**
     * Delete OpenAI API Key from all storage locations
     */
    async deleteOpenAIApiKey(): Promise<void> {
        try {
            await Promise.all([
                this.context.secrets.delete(SecretStorageManager.SECRET_KEY),
                this.context.globalState.update(SecretStorageManager.GLOBAL_STATE_KEY, undefined)
            ]);
            console.log('[SecretStorage] API key deleted from all storage locations');
        } catch (error) {
            console.error('[SecretStorage] Error deleting API key:', error);
            // Try to delete from at least one location
            await this.context.globalState.update(SecretStorageManager.GLOBAL_STATE_KEY, undefined);
        }
    }

    /**
     * Force clear deprecated settings on every startup
     * This ensures API keys are never left in plain text settings
     */
    async forceClearDeprecatedSettings(): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('otakCommitter');
            const openaiKey = config.get<string>('openaiApiKey');

            // Always clear the deprecated setting, even if it's already empty
            // This ensures it's cleaned from all scopes
            if (openaiKey !== undefined && openaiKey !== '') {
                console.log('Force clearing deprecated API key setting for security...');

                // Clear from all configuration targets
                await config.update('openaiApiKey', '', vscode.ConfigurationTarget.Global);
                await config.update('openaiApiKey', '', vscode.ConfigurationTarget.Workspace);
                await config.update('openaiApiKey', '', vscode.ConfigurationTarget.WorkspaceFolder);

                console.log('Deprecated API key setting cleared from all scopes');
            }
        } catch (error) {
            console.error('Failed to force clear deprecated settings:', error);
        }
    }

    /**
     * Check if API key exists (in any storage)
     */
    async hasOpenAIApiKey(): Promise<boolean> {
        // Use our enhanced getOpenAIApiKey which checks all storage locations
        const key = await this.getOpenAIApiKey();
        return !!(key && key.trim() !== '');
    }

    /**
     * Prompt user to configure API key
     */
    async promptForOpenAIApiKey(): Promise<boolean> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenAI API Key',
            placeHolder: 'sk-...',
            password: true, // Hide the input
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return 'API Key is required';
                }
                if (!value.startsWith('sk-')) {
                    return 'Invalid API Key format (should start with sk-)';
                }
                return undefined;
            }
        });

        if (apiKey) {
            await this.setOpenAIApiKey(apiKey);
            vscode.window.showInformationMessage('OpenAI API Key has been securely saved');
            return true;
        }

        return false;
    }

    /**
     * Diagnostic method to check storage status
     */
    async diagnoseStorage(): Promise<void> {
        const outputChannel = vscode.window.createOutputChannel('otak-committer Storage Diagnostics');
        outputChannel.clear();
        outputChannel.show();

        outputChannel.appendLine('=== Storage Diagnostics ===');
        outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
        outputChannel.appendLine('');

        // Check environment
        outputChannel.appendLine('Environment:');
        outputChannel.appendLine(`  Platform: ${process.platform}`);
        outputChannel.appendLine(`  VS Code Version: ${vscode.version}`);
        outputChannel.appendLine(`  Extension Mode: ${this.context.extensionMode}`);
        outputChannel.appendLine(`  WSL: ${process.env.WSL_DISTRO_NAME || 'Not detected'}`);
        outputChannel.appendLine(`  Remote: ${this.context.extension.extensionKind === vscode.ExtensionKind.Workspace}`);
        outputChannel.appendLine('');

        // Check SecretStorage
        outputChannel.appendLine('SecretStorage Status:');
        try {
            const secretKey = await this.context.secrets.get(SecretStorageManager.SECRET_KEY);
            outputChannel.appendLine(`  API Key in SecretStorage: ${secretKey ? 'Found' : 'Not found'}`);
            if (secretKey) {
                outputChannel.appendLine(`  Key Length: ${secretKey.length} characters`);
            }
        } catch (error) {
            outputChannel.appendLine(`  Error accessing SecretStorage: ${error}`);
        }
        outputChannel.appendLine('');

        // Check GlobalState backup
        outputChannel.appendLine('GlobalState Encrypted Backup Status:');
        try {
            const encryptedBackup = this.context.globalState.get<string>(SecretStorageManager.GLOBAL_STATE_KEY);
            outputChannel.appendLine(`  Encrypted API Key in GlobalState: ${encryptedBackup ? 'Found' : 'Not found'}`);
            if (encryptedBackup) {
                outputChannel.appendLine(`  Encrypted Length: ${encryptedBackup.length} characters`);

                // Try to decrypt to verify integrity
                try {
                    const decrypted = EncryptionUtil.decrypt(encryptedBackup);
                    outputChannel.appendLine(`  Decryption: Successful`);
                    outputChannel.appendLine(`  Decrypted Key Length: ${decrypted.length} characters`);
                } catch (decryptError) {
                    outputChannel.appendLine(`  Decryption: Failed - ${decryptError}`);
                }
            }
        } catch (error) {
            outputChannel.appendLine(`  Error accessing GlobalState: ${error}`);
        }
        outputChannel.appendLine('');

        // Check deprecated configuration
        outputChannel.appendLine('Deprecated Configuration Status:');
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const configKey = config.get<string>('openaiApiKey');
        outputChannel.appendLine(`  API Key in Configuration: ${configKey ? 'Found (SHOULD BE REMOVED)' : 'Not found (Good)'}`);

        outputChannel.appendLine('');

        // Test encryption/decryption
        outputChannel.appendLine('Encryption Self Test:');
        const encryptionTestResult = await EncryptionUtil.selfTest();
        outputChannel.appendLine(`  Encryption/Decryption: ${encryptionTestResult ? 'Working ✓' : 'Failed ✗'}`);

        outputChannel.appendLine('');
        outputChannel.appendLine('=== End of Diagnostics ===');

        vscode.window.showInformationMessage('Storage diagnostics complete. Check the Output panel for details.');
    }
}