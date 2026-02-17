import * as vscode from 'vscode';
import { SupportedLanguage } from '../../types/enums/SupportedLanguage.js';
import { MessageStyle, EmojiStyle } from '../../types/enums/MessageStyle.js';

/**
 * Configuration interface for the extension
 */
export interface ExtensionConfig {
    language: SupportedLanguage;
    messageStyle: MessageStyle;
    useEmoji: boolean;
    emojiStyle: EmojiStyle;
    customMessage: string;
    appendCommitTrailer: boolean;
    useConventionalCommits: boolean;
    maxInputTokens: number;
}

/**
 * Manages extension configuration with type-safe access
 * 
 * Provides a centralized interface for reading and writing extension configuration
 * values, ensuring type safety and consistent access patterns across the codebase.
 * 
 * @example
 * ```typescript
 * const config = new ConfigManager();
 * const language = config.get('language');
 * await config.set('language', SupportedLanguage.Japanese);
 * ```
 */
export class ConfigManager {
    private static readonly SECTION = 'otakCommitter';

    /**
     * Gets a configuration value by key
     * 
     * @param key - The configuration key to retrieve
     * @returns The configuration value
     * 
     * @example
     * ```typescript
     * const language = config.get('language');
     * const useEmoji = config.get('useEmoji');
     * ```
     */
    get<K extends keyof ExtensionConfig>(key: K): ExtensionConfig[K] {
        const config = vscode.workspace.getConfiguration(ConfigManager.SECTION);
        return config.get<ExtensionConfig[K]>(key) as ExtensionConfig[K];
    }

    /**
     * Sets a configuration value
     * 
     * @param key - The configuration key to set
     * @param value - The value to set
     * @param target - The configuration target (Global, Workspace, or WorkspaceFolder)
     * @returns A promise that resolves when the configuration is updated
     * 
     * @example
     * ```typescript
     * await config.set('language', SupportedLanguage.Japanese);
     * await config.set('messageStyle', MessageStyle.Detailed, vscode.ConfigurationTarget.Workspace);
     * ```
     */
    async set<K extends keyof ExtensionConfig>(
        key: K,
        value: ExtensionConfig[K],
        target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigManager.SECTION);
        await config.update(key, value, target);
    }

    /**
     * Gets all configuration values as a single object
     * 
     * @returns An object containing all configuration values
     * 
     * @example
     * ```typescript
     * const allConfig = config.getAll();
     * console.log(allConfig.language, allConfig.messageStyle);
     * ```
     */
    getAll(): ExtensionConfig {
        return {
            language: this.get('language'),
            messageStyle: this.get('messageStyle'),
            useEmoji: this.get('useEmoji'),
            emojiStyle: this.get('emojiStyle'),
            customMessage: this.get('customMessage'),
            appendCommitTrailer: this.get('appendCommitTrailer'),
            useConventionalCommits: this.get('useConventionalCommits'),
            maxInputTokens: this.get('maxInputTokens')
        };
    }

    /**
     * Sets default configuration values if they are not already set
     * 
     * This method should be called during extension activation to ensure
     * all configuration values have sensible defaults.
     * 
     * @returns A promise that resolves when defaults are set
     * 
     * @example
     * ```typescript
     * const config = new ConfigManager();
     * await config.setDefaults();
     * ```
     */
    async setDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigManager.SECTION);
        
        // Only set defaults if values are undefined (not set by user)
        if (config.get('language') === undefined) {
            await this.set('language', SupportedLanguage.English);
        }
        if (config.get('messageStyle') === undefined) {
            await this.set('messageStyle', MessageStyle.Normal);
        }
        if (config.get('useEmoji') === undefined) {
            await this.set('useEmoji', false);
        }
        if (config.get('emojiStyle') === undefined) {
            await this.set('emojiStyle', EmojiStyle.GitHub);
        }
        if (config.get('customMessage') === undefined) {
            await this.set('customMessage', '');
        }
    }
}
