import * as vscode from 'vscode';

/**
 * Manages API keys using VS Code's SecretStorage API for secure storage
 */
export class SecretStorageManager {
    private static instance: SecretStorageManager | undefined;
    private context: vscode.ExtensionContext;

    private constructor(context: vscode.ExtensionContext) {
        this.context = context;
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
     * Get OpenAI API Key from secure storage
     */
    async getOpenAIApiKey(): Promise<string | undefined> {
        return await this.context.secrets.get('otak-committer.openaiApiKey');
    }

    /**
     * Set OpenAI API Key in secure storage
     */
    async setOpenAIApiKey(value: string): Promise<void> {
        await this.context.secrets.store('otak-committer.openaiApiKey', value);
    }

    /**
     * Delete OpenAI API Key from secure storage
     */
    async deleteOpenAIApiKey(): Promise<void> {
        await this.context.secrets.delete('otak-committer.openaiApiKey');
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
     * Check if API key exists (in either storage)
     */
    async hasOpenAIApiKey(): Promise<boolean> {
        const secretKey = await this.getOpenAIApiKey();
        if (secretKey && secretKey.trim() !== '') {
            return true;
        }

        // Check configuration as fallback (for backwards compatibility during transition)
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const configKey = config.get<string>('openaiApiKey');
        return !!(configKey && configKey.trim() !== '');
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
}