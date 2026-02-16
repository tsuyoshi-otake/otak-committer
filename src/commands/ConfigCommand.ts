import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand.js';
import { LANGUAGE_CONFIGS } from '../languages/index.js';
import { SupportedLanguage } from '../types/enums/SupportedLanguage.js';
import { MessageStyle } from '../types/enums/MessageStyle.js';
import { t, LanguagePreferenceManager, SupportedLocale } from '../i18n/index.js';

/**
 * Command for managing extension configuration
 * 
 * Handles language and message style changes through the ConfigManager,
 * providing a unified interface for configuration operations.
 * 
 * @example
 * ```typescript
 * const configCommand = new ConfigCommand(context);
 * await configCommand.changeLanguage();
 * await configCommand.changeMessageStyle();
 * ```
 */
export class ConfigCommand extends BaseCommand {
    /**
     * Execute the command (not used for ConfigCommand)
     * ConfigCommand uses specific methods instead
     */
    async execute(): Promise<void> {
        // ConfigCommand doesn't use the generic execute method
        // It provides specific methods for different configuration operations
        throw new Error('ConfigCommand should use specific methods like changeLanguage() or changeMessageStyle()');
    }

    /**
     * Change the language setting
     *
 * Displays a quick pick menu with all available languages and updates
 * the configuration when the user makes a selection. Also updates
 * the language setting used for commit message generation.
     *
     * @returns A promise that resolves when the language is changed or the user cancels
     *
     * @example
     * ```typescript
     * const configCommand = new ConfigCommand(context);
     * await configCommand.changeLanguage();
     * ```
     */
    async changeLanguage(): Promise<void> {
        try {
            this.logger.info('Starting language change operation');

            // Build language options from LANGUAGE_CONFIGS
            const languages = Object.entries(LANGUAGE_CONFIGS).map(([key, config]) => ({
                label: config.label,
                description: key,
                detail: config.description
            }));

            // Show quick pick menu
            const selected = await vscode.window.showQuickPick(languages, {
                placeHolder: t('quickPick.selectCommitLanguage'),
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                // Update configuration using ConfigManager
                await this.config.set(
                    'language',
                    selected.description as SupportedLanguage,
                    vscode.ConfigurationTarget.Global
                );

                // UI localization is only supported for English and Japanese.
                // Keep the stored "preferred locale" in sync for these two languages.
                const localeMap: Record<string, SupportedLocale | undefined> = {
                    'japanese': 'ja',
                    'english': 'en'
                };
                const locale = localeMap[selected.description as string];
                if (locale) {
                    await LanguagePreferenceManager.setPreferredLanguage(locale);
                }

                this.logger.info(`Language changed to: ${selected.description}`);
                vscode.window.showInformationMessage(t('messages.languageChanged', { language: selected.label }));
            } else {
                this.logger.debug('Language change cancelled by user');
            }
        } catch (error) {
            this.handleError(error, 'changing language');
        }
    }

    /**
     * Change the message style setting
     * 
     * Displays a quick pick menu with available message styles and updates
     * the configuration when the user makes a selection.
     * 
     * @returns A promise that resolves when the message style is changed or the user cancels
     * 
     * @example
     * ```typescript
     * const configCommand = new ConfigCommand(context);
     * await configCommand.changeMessageStyle();
     * ```
     */
    async changeMessageStyle(): Promise<void> {
        try {
            this.logger.info('Starting message style change operation');

            // Build style options
            const styles = [
                {
                    label: t('messageStyles.simple'),
                    description: MessageStyle.Simple,
                    detail: t('messageStyles.simpleDetail')
                },
                {
                    label: t('messageStyles.normal'),
                    description: MessageStyle.Normal,
                    detail: t('messageStyles.normalDetail')
                },
                {
                    label: t('messageStyles.detailed'),
                    description: MessageStyle.Detailed,
                    detail: t('messageStyles.detailedDetail')
                }
            ];

            // Show quick pick menu
            const selected = await vscode.window.showQuickPick(styles, {
                placeHolder: t('quickPick.selectMessageStyle'),
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                // Update configuration using ConfigManager
                await this.config.set(
                    'messageStyle',
                    selected.description as MessageStyle,
                    vscode.ConfigurationTarget.Global
                );

                this.logger.info(`Message style changed to: ${selected.description}`);
                vscode.window.showInformationMessage(t('messages.messageStyleChanged', { style: selected.label }));
            } else {
                this.logger.debug('Message style change cancelled by user');
            }
        } catch (error) {
            this.handleError(error, 'changing message style');
        }
    }
}
