import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand.js';
import { LANGUAGE_CONFIGS } from '../languages/index.js';
import { SupportedLanguage } from '../types/enums/SupportedLanguage.js';
import { MessageStyle } from '../types/enums/MessageStyle.js';

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
     * the configuration when the user makes a selection.
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
                placeHolder: 'Select commit message language',
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

                this.logger.info(`Language changed to: ${selected.description}`);
                vscode.window.showInformationMessage(`Language changed to ${selected.label}`);
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
                    label: 'Simple', 
                    description: MessageStyle.Simple,
                    detail: 'Brief commit messages with minimal detail'
                },
                { 
                    label: 'Normal', 
                    description: MessageStyle.Normal,
                    detail: 'Standard commit messages with moderate detail'
                },
                { 
                    label: 'Detailed', 
                    description: MessageStyle.Detailed,
                    detail: 'Comprehensive commit messages with full context'
                }
            ];

            // Show quick pick menu
            const selected = await vscode.window.showQuickPick(styles, {
                placeHolder: 'Select message style',
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
                vscode.window.showInformationMessage(`Message style changed to ${selected.label}`);
            } else {
                this.logger.debug('Message style change cancelled by user');
            }
        } catch (error) {
            this.handleError(error, 'changing message style');
        }
    }
}
