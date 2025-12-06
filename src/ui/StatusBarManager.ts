import * as vscode from 'vscode';
import { ConfigManager } from '../infrastructure/config/ConfigManager.js';
import { LANGUAGE_CONFIGS } from '../languages/index.js';
import { MessageStyle } from '../types/enums/MessageStyle.js';
import { Logger } from '../infrastructure/logging/Logger.js';

/**
 * Manages the status bar item for language and configuration display
 * 
 * Provides a visual indicator in the VS Code status bar showing the current
 * language and message style configuration. The status bar item is interactive
 * and allows users to change settings through command links.
 * 
 * @example
 * ```typescript
 * const statusBar = new StatusBarManager(context, config);
 * statusBar.initialize();
 * statusBar.update();
 * ```
 */
export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private logger: Logger;

    /**
     * Creates a new StatusBarManager instance
     * 
     * @param context - The VS Code extension context
     * @param config - The configuration manager
     */
    constructor(
        private context: vscode.ExtensionContext,
        private config: ConfigManager
    ) {
        this.logger = Logger.getInstance();
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.context.subscriptions.push(this.statusBarItem);
    }

    /**
     * Initialize the status bar item
     * 
     * Sets up the initial display and shows the status bar item.
     */
    initialize(): void {
        this.logger.debug('Initializing status bar');
        this.update();
        this.statusBarItem.show();
        this.logger.debug('Status bar initialized');
    }

    /**
     * Update the status bar display
     * 
     * Refreshes the status bar text and tooltip based on current configuration.
     * This should be called whenever the configuration changes.
     */
    update(): void {
        this.logger.debug('Updating status bar');

        const language = this.config.get('language') || 'english';
        const languageConfig = LANGUAGE_CONFIGS[language as keyof typeof LANGUAGE_CONFIGS];

        if (!languageConfig) {
            this.logger.warning(`Unknown language configuration: ${language}`);
            return;
        }

        // Set status bar text
        this.statusBarItem.text = `$(globe) ${languageConfig.label}`;

        // Build tooltip
        const tooltip = this.buildTooltip();
        this.statusBarItem.tooltip = tooltip;

        // Set command
        this.statusBarItem.command = {
            title: 'Change Language',
            command: 'otak-committer.changeLanguage'
        };

        this.logger.debug('Status bar updated successfully');
    }

    /**
     * Build the tooltip markdown for the status bar
     * 
     * @returns A markdown string with configuration information and command links
     */
    private buildTooltip(): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.supportThemeIcons = true;

        const messageStyle = this.config.get('messageStyle') || MessageStyle.Normal;

        tooltip.appendMarkdown(`Configuration\n\n`);
        tooltip.appendMarkdown(`Current Style: ${messageStyle}\n\n`);
        tooltip.appendMarkdown(`---\n\n`);
        tooltip.appendMarkdown(
            `$(key) [Set API Key](command:otak-committer.setApiKey) &nbsp;&nbsp; ` +
            `$(gear) [Open Settings](command:otak-committer.openSettings)`
        );

        return tooltip;
    }

    /**
     * Dispose of the status bar item
     * 
     * Cleans up resources when the status bar is no longer needed.
     */
    dispose(): void {
        this.logger.debug('Disposing status bar');
        this.statusBarItem.dispose();
    }
}
