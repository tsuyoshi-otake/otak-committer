import * as vscode from 'vscode';
import { ConfigManager } from '../infrastructure/config/ConfigManager.js';
import { LANGUAGE_CONFIGS } from '../languages/index.js';
import { MessageStyle } from '../types/enums/MessageStyle.js';
import { Logger } from '../infrastructure/logging/Logger.js';
import { t } from '../i18n/index.js';

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
        this.detectRepoVisibility();
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
        const visibilityLabel = this._isPublicRepo === true
            ? t('statusBar.public')
            : this._isPublicRepo === false
                ? t('statusBar.private')
                : '';
        this.statusBarItem.text = visibilityLabel
            ? `${this.repoIcon} ${visibilityLabel}: ${languageConfig.label}`
            : `${this.repoIcon} ${languageConfig.label}`;

        // Build tooltip
        const tooltip = this.buildTooltip();
        this.statusBarItem.tooltip = tooltip;

        // Set command
        this.statusBarItem.command = {
            title: t('commands.changeLanguage'),
            command: 'otak-committer.changeLanguage',
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

        tooltip.appendMarkdown(`${t('statusBar.configuration')}\n\n`);
        tooltip.appendMarkdown(`${t('statusBar.currentStyle')}: ${messageStyle}\n\n`);
        tooltip.appendMarkdown(`---\n\n`);
        tooltip.appendMarkdown(
            `$(key) [${t('statusBar.setApiKey')}](command:otak-committer.setApiKey) &nbsp;&nbsp; ` +
                `$(gear) [${t('statusBar.openSettings')}](command:otak-committer.openSettings)`,
        );

        return tooltip;
    }

    private detectRepoVisibility(): void {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
            this.logger.debug('Git extension not available for repo visibility detection');
            return;
        }

        const gitApi = gitExtension.getAPI(1);
        const repo = gitApi?.repositories?.[0];
        if (!repo) {
            this.logger.debug('No Git repository found for visibility detection');
            return;
        }

        repo.getConfig('remote.origin.url').then((remoteUrl: string | undefined) => {
            if (!remoteUrl) {
                this.logger.debug('No remote origin URL found');
                return;
            }

            const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)(?:\.git)?$/);
            if (!match) {
                this.logger.debug('Remote URL is not a GitHub repository');
                return;
            }

            const [, owner, repoName] = match;
            this._repoFullName = `${owner}/${repoName}`;
            this.checkGitHubRepoVisibility(owner, repoName);
        }, (error: unknown) => {
            this.logger.debug(`Failed to get remote URL: ${error}`);
        });
    }

    private checkGitHubRepoVisibility(owner: string, repoName: string): void {
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;

        fetch(url, {
            headers: { 'User-Agent': 'otak-committer' },
        }).then((response) => {
            if (response.ok) {
                return response.json() as Promise<{ private: boolean }>;
            }
            // 404 or other error means private or inaccessible
            this.applyVisibilityStyle(true);
            this.logger.debug(`Repository ${owner}/${repoName} detected as private`);
            return null;
        }).then((data: { private: boolean } | null) => {
            if (data) {
                this.applyVisibilityStyle(data.private);
                this.logger.debug(`Repository ${owner}/${repoName} visibility: ${data.private ? 'private' : 'public'}`);
            }
        }).catch((error) => {
            this.logger.debug(`Failed to check repo visibility: ${error}`);
        });
    }

    private applyVisibilityStyle(isPrivate: boolean): void {
        this._isPublicRepo = !isPrivate;
        this.repoIcon = isPrivate ? '$(lock)' : '$(globe)';
        this.update();

        if (!isPrivate && !this.isPublicRepoWarningSuppressed()) {
            this.showPublicRepoOpenWarning();
        }
    }

    private async showPublicRepoOpenWarning(): Promise<void> {
        const choice = await vscode.window.showWarningMessage(
            t('messages.publicRepoOpenWarning'),
            t('buttons.yes'),
            t('buttons.dontShowAgain'),
        );
        if (choice === t('buttons.dontShowAgain')) {
            await this.suppressPublicRepoWarning();
        }
    }

    get isPublicRepo(): boolean | null {
        return this._isPublicRepo;
    }

    get repoFullName(): string | null {
        return this._repoFullName;
    }

    isPublicRepoWarningSuppressed(): boolean {
        if (!this._repoFullName) {
            return false;
        }
        const suppressed: string[] =
            this.context.globalState.get('publicRepoWarningSuppressed', []);
        return suppressed.includes(this._repoFullName);
    }

    async suppressPublicRepoWarning(): Promise<void> {
        if (!this._repoFullName) {
            return;
        }
        const suppressed: string[] =
            this.context.globalState.get('publicRepoWarningSuppressed', []);
        if (!suppressed.includes(this._repoFullName)) {
            suppressed.push(this._repoFullName);
            await this.context.globalState.update('publicRepoWarningSuppressed', suppressed);
        }
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
