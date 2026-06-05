import * as vscode from 'vscode';
import { ConfigManager } from '../infrastructure/config/ConfigManager.js';
import { Logger } from '../infrastructure/logging/Logger.js';
import { t } from '../i18n/index.js';
import {
    isPublicRepoWarningSuppressed as isWarningSuppressed,
    showPublicRepoOpenWarning,
    suppressPublicRepoWarning as suppressWarning,
} from './publicRepoWarning.js';
import { buildStatusBarText, buildStatusBarTooltip, getLanguageLabel } from './statusBar.view.js';
import { detectRepositoryVisibility } from './statusBar.visibility.js';

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
    private repoIcon: string = '$(repo)';
    private _isPublicRepo: boolean | null = null;
    private _repoFullName: string | null = null;

    /**
     * Creates a new StatusBarManager instance
     *
     * @param context - The VS Code extension context
     * @param config - The configuration manager
     */
    constructor(
        private context: vscode.ExtensionContext,
        private config: ConfigManager,
    ) {
        this.logger = Logger.getInstance();
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100,
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
        void this.detectRepoVisibility();
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
        const languageLabel = getLanguageLabel(language);

        if (!languageLabel) {
            this.logger.warning(`Unknown language configuration: ${language}`);
            return;
        }

        this.statusBarItem.text = buildStatusBarText(
            this.repoIcon,
            this._isPublicRepo,
            languageLabel,
        );
        this.statusBarItem.tooltip = buildStatusBarTooltip(this.config);

        // Set command
        this.statusBarItem.command = {
            title: t('commands.changeLanguage'),
            command: 'otak-committer.changeLanguage',
        };

        this.logger.debug('Status bar updated successfully');
    }

    private async detectRepoVisibility(): Promise<void> {
        const visibility = await detectRepositoryVisibility(this.logger);
        if (!visibility) {
            return;
        }

        this._repoFullName = visibility.fullName;
        await this.applyVisibilityStyle(visibility.isPrivate);
    }

    private async applyVisibilityStyle(isPrivate: boolean): Promise<void> {
        this._isPublicRepo = !isPrivate;
        this.repoIcon = isPrivate ? '$(lock)' : '$(globe)';
        this.update();

        if (!isPrivate && !this.isPublicRepoWarningSuppressed()) {
            await showPublicRepoOpenWarning(this.context.globalState, this._repoFullName);
        }
    }

    get isPublicRepo(): boolean | null {
        return this._isPublicRepo;
    }

    get repoFullName(): string | null {
        return this._repoFullName;
    }

    isPublicRepoWarningSuppressed(): boolean {
        return isWarningSuppressed(this.context.globalState, this._repoFullName);
    }

    async suppressPublicRepoWarning(): Promise<void> {
        await suppressWarning(this.context.globalState, this._repoFullName);
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
