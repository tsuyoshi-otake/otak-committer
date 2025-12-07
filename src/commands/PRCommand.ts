import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { GitHubService, GitHubServiceFactory } from '../services/github';
import { OpenAIService } from '../services/openai';
import { GitServiceFactory } from '../services/git';
import { ServiceError } from '../types/errors';
import { showMarkdownPreview, closePreviewTabs, cleanupPreviewFiles } from '../utils/preview';
import { t } from '../i18n/index.js';

interface Issue {
    number: number;
    title: string;
    labels: string[];
    html_url?: string;
}

interface BranchSelection {
    base: string;
    compare: string;
}

/**
 * Command for generating pull requests using AI
 * 
 * This command handles the entire PR creation workflow including branch selection,
 * issue linking, AI-powered content generation, and PR creation on GitHub.
 * 
 * @example
 * ```typescript
 * const command = new PRCommand(context);
 * await command.execute();
 * ```
 */
export class PRCommand extends BaseCommand {
    private previewFile?: { uri: vscode.Uri; document: vscode.TextDocument };

    /**
     * Execute the PR generation command
     * 
     * Workflow:
     * 1. Authenticate with GitHub
     * 2. Select base and compare branches
     * 3. Initialize GitHub service
     * 4. Optionally select related issue
     * 5. Get branch diff and templates
     * 6. Generate PR content using AI
     * 7. Show preview to user
     * 8. Select PR type (draft or regular)
     * 9. Create PR on GitHub
     * 
     * @returns A promise that resolves when the command completes
     */
    async execute(): Promise<void> {
        try {
            this.logger.info('Starting PR generation');

            // Authenticate with GitHub
            const session = await this.authenticateGitHub();
            if (!session) {
                return;
            }

            // Select branches
            const branches = await this.selectBranches();
            if (!branches) {
                return;
            }

            // Initialize GitHub service
            const github = await this.initializeGitHub();
            if (!github) {
                return;
            }

            // Optionally select related issue
            const issueNumber = await this.selectIssue(github);

            // Get templates
            const templates = await this.findTemplates();

            // Get branch diff
            const diff = await this.getBranchDiff(github, branches);
            if (!diff) {
                return;
            }

            // Initialize OpenAI service
            const openai = await this.initializeOpenAI();
            if (!openai) {
                return;
            }

            // Generate PR content
            const prContent = await this.generatePRContent(openai, diff, templates.pr);
            if (!prContent) {
                return;
            }

            // Show preview
            const previewSuccess = await this.showPreview(prContent, issueNumber);
            if (!previewSuccess) {
                return;
            }

            // Select PR type
            const prType = await this.selectPRType();
            if (!prType) {
                return;
            }

            // Create PR
            await this.createPR(github, branches, prContent, issueNumber, prType.value);

            this.logger.info('Successfully created PR');

        } catch (error) {
            this.handleError(error, 'generating pull request');
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Authenticate with GitHub
     * 
     * @returns GitHub authentication session or undefined if authentication fails
     */
    private async authenticateGitHub(): Promise<vscode.AuthenticationSession | undefined> {
        this.logger.debug('Authenticating with GitHub');

        const session = await vscode.authentication.getSession(
            'github',
            ['repo'],
            { createIfNone: true }
        );

        if (!session) {
            this.logger.warning('GitHub authentication failed');
            vscode.window.showErrorMessage(t('messages.authRequired'));
            return undefined;
        }

        return session;
    }

    /**
     * Select base and compare branches for the PR
     * 
     * @returns Branch selection or undefined if cancelled
     */
    private async selectBranches(): Promise<BranchSelection | undefined> {
        this.logger.debug('Selecting branches for PR');

        const branches = await GitHubService.selectBranches();
        if (!branches) {
            this.logger.info('Branch selection cancelled');
            return undefined;
        }

        this.logger.debug(`Selected branches: ${branches.base} <- ${branches.compare}`);
        return branches;
    }

    /**
     * Initialize GitHub service
     * 
     * @returns GitHub service instance or undefined if initialization fails
     */
    private async initializeGitHub(): Promise<GitHubService | undefined> {
        this.logger.debug('Initializing GitHub service');

        const github = await GitHubServiceFactory.initialize();
        if (!github) {
            this.logger.error('Failed to initialize GitHub service');
            return undefined;
        }

        return github;
    }

    /**
     * Optionally select a related issue for the PR
     * 
     * @param github - GitHub service instance
     * @returns Issue number or undefined if no issue selected
     */
    private async selectIssue(github: GitHubService): Promise<number | undefined> {
        this.logger.debug('Fetching issues for selection');

        try {
            const issues = await github.getIssues();
            if (issues.length === 0) {
                this.logger.debug('No open issues found');
                return undefined;
            }

            const issueItems = issues.map((issue: Issue) => ({
                label: `#${issue.number} ${issue.title}`,
                description: issue.labels.join(', '),
                issue
            }));

            const selectedIssue = await vscode.window.showQuickPick(
                issueItems,
                {
                    placeHolder: t('quickPick.selectRelatedIssue'),
                    ignoreFocusOut: true
                }
            );

            if (selectedIssue) {
                this.logger.debug(`Selected issue #${selectedIssue.issue.number}`);
                return selectedIssue.issue.number;
            }

            return undefined;

        } catch (error) {
            this.logger.warning('Failed to fetch issues', error);
            return undefined;
        }
    }

    /**
     * Find PR templates in the repository
     * 
     * @returns Template information
     */
    private async findTemplates(): Promise<{ commit?: any; pr?: any }> {
        this.logger.debug('Looking for PR templates');

        const git = await GitServiceFactory.initialize();
        if (!git) {
            return {};
        }

        return await git.findTemplates();
    }

    /**
     * Get the diff between two branches
     * 
     * @param github - GitHub service instance
     * @param branches - Branch selection
     * @returns Branch diff or undefined if no changes
     */
    private async getBranchDiff(
        github: GitHubService,
        branches: BranchSelection
    ): Promise<any | undefined> {
        this.logger.debug(`Getting diff between ${branches.base} and ${branches.compare}`);

        try {
            const diff = await github.getBranchDiffDetails(branches.base, branches.compare);

            if (!diff.files.length) {
                this.logger.info('No changes found between branches');
                vscode.window.showErrorMessage(t('messages.noChangesBetweenBranches'));
                return undefined;
            }

            return diff;

        } catch (error) {
            this.logger.error('Failed to get branch diff', error);
            throw new ServiceError(
                'Failed to get branch diff',
                'github',
                { originalError: error }
            );
        }
    }

    /**
     * Initialize OpenAI service with API key from storage
     * 
     * @returns OpenAI service instance or undefined if initialization fails
     */
    private async initializeOpenAI(): Promise<OpenAIService | undefined> {
        this.logger.debug('Initializing OpenAI service');

        try {
            const apiKey = await this.storage.getApiKey('openai');

            if (!apiKey) {
                this.logger.warning('OpenAI API key not found in storage');

                const configured = await vscode.window.showWarningMessage(
                    t('messages.apiKeyNotConfigured'),
                    t('buttons.yes'),
                    t('buttons.no')
                );

                if (configured === t('buttons.yes')) {
                    await vscode.commands.executeCommand(
                        'workbench.action.openSettings',
                        'otakCommitter.openaiApiKey'
                    );
                }

                return undefined;
            }

            const openai = await OpenAIService.initialize({
                openaiApiKey: apiKey,
                language: this.config.get('language'),
                messageStyle: this.config.get('messageStyle'),
                useEmoji: this.config.get('useEmoji')
            }, this.context);

            if (!openai) {
                this.logger.error('Failed to initialize OpenAI service');
                return undefined;
            }

            return openai;

        } catch (error) {
            this.logger.error('Error initializing OpenAI service', error);
            throw new ServiceError(
                'Failed to initialize OpenAI service',
                'openai',
                { originalError: error }
            );
        }
    }

    /**
     * Generate PR content using OpenAI
     * 
     * @param openai - OpenAI service instance
     * @param diff - Branch diff
     * @param template - Optional PR template
     * @returns Generated PR content or undefined if generation fails
     */
    private async generatePRContent(
        openai: OpenAIService,
        diff: any,
        template?: any
    ): Promise<{ title: string; body: string } | undefined> {
        this.logger.debug('Generating PR content with AI');

        const prContent = await this.withProgress(
            t('progress.analyzingChanges'),
            async () => {
                const language = this.config.get('language') || 'english';

                this.logger.debug(`Using language: ${language}`);

                const result = await openai.generatePRContent(diff, language, template);

                if (!result) {
                    return undefined;
                }

                return result;
            }
        );

        if (!prContent) {
            this.logger.error('Failed to generate PR content');
            vscode.window.showErrorMessage(t('messages.failedToGeneratePR'));
            return undefined;
        }

        return prContent;
    }

    /**
     * Show markdown preview of the PR content
     * 
     * @param prContent - Generated PR content
     * @param issueNumber - Optional issue number
     * @returns True if preview was shown successfully
     */
    private async showPreview(
        prContent: { title: string; body: string },
        issueNumber?: number
    ): Promise<boolean> {
        this.logger.debug('Showing PR preview');

        let previewContent = `${prContent.title}\n\n---\n\n${prContent.body}`;
        if (issueNumber) {
            previewContent += `\n\nResolves #${issueNumber}`;
        }

        this.previewFile = await showMarkdownPreview(previewContent, 'pr');
        if (!this.previewFile) {
            this.logger.error('Failed to show preview');
            vscode.window.showErrorMessage(t('messages.failedToShowPreview'));
            return false;
        }

        return true;
    }

    /**
     * Select PR type (draft or regular)
     * 
     * @returns PR type selection or undefined if cancelled
     */
    private async selectPRType(): Promise<{ label: string; value: boolean } | undefined> {
        this.logger.debug('Selecting PR type');

        const prType = await vscode.window.showQuickPick(
            [
                { label: t('prTypes.draft'), description: t('prTypes.draftDescription'), value: true },
                { label: t('prTypes.regular'), description: t('prTypes.regularDescription'), value: false }
            ],
            {
                placeHolder: t('quickPick.selectPRType'),
                ignoreFocusOut: true
            }
        );

        if (!prType) {
            this.logger.info('PR type selection cancelled');
            return undefined;
        }

        this.logger.debug(`Selected PR type: ${prType.label}`);
        return prType;
    }

    /**
     * Create the pull request on GitHub
     * 
     * @param github - GitHub service instance
     * @param branches - Branch selection
     * @param prContent - Generated PR content
     * @param issueNumber - Optional issue number
     * @param isDraft - Whether to create as draft PR
     */
    private async createPR(
        github: GitHubService,
        branches: BranchSelection,
        prContent: { title: string; body: string },
        issueNumber: number | undefined,
        isDraft: boolean
    ): Promise<void> {
        this.logger.debug('Creating PR on GitHub');

        const description = issueNumber
            ? `${prContent.body}\n\nResolves #${issueNumber}`
            : prContent.body;

        const prTypeStr = isDraft ? t('prTypes.draft') : t('prTypes.regular');

        try {
            const result = await this.withProgress(
                t('progress.creatingPR', { prType: prTypeStr }),
                async () => {
                    // Validate branch changes
                    this.logger.debug('Validating branch changes');
                    const changes = await github.getBranchDiffDetails(branches.base, branches.compare);
                    if (!changes.files.length) {
                        throw new Error('No changes to create a pull request');
                    }

                    try {
                        this.logger.debug('Creating PR with GitHub API');
                        const pr = await github.createPullRequest({
                            base: branches.base,
                            compare: branches.compare,
                            title: prContent.title,
                            body: description,
                            issueNumber,
                            draft: isDraft
                        });

                        if (!pr || !pr.number) {
                            throw new Error('Failed to create PR: Invalid response from GitHub');
                        }

                        this.logger.info(`PR #${pr.number} created successfully`);
                        return pr;

                    } catch (error: any) {
                        // Handle draft PR not supported error
                        if (isDraft && error.message?.includes('Draft pull requests are not supported')) {
                            this.logger.warning('Draft PRs not supported, creating regular PR');

                            await vscode.window.showInformationMessage(t('messages.draftPRNotSupported'));

                            const regularPr = await github.createPullRequest({
                                base: branches.base,
                                compare: branches.compare,
                                title: prContent.title,
                                body: description,
                                issueNumber,
                                draft: false
                            });

                            if (!regularPr || !regularPr.number) {
                                throw new Error('Failed to create regular PR: Invalid response from GitHub');
                            }

                            this.logger.info(`Regular PR #${regularPr.number} created successfully`);
                            return regularPr;
                        }
                        throw error;
                    }
                }
            );

            // Show success notification
            if (result && result.number) {
                await this.showSuccessNotification(result, isDraft);
            } else {
                throw new Error('PR creation failed: No PR details received');
            }

        } catch (error: any) {
            if (error.message === 'No changes to create a pull request') {
                vscode.window.showErrorMessage(t('messages.noChangesBetweenBranches'));
                return;
            }

            // Handle GitHub API errors
            if (error.response?.errors) {
                const messages = error.response.errors.map((e: { message: string }) => e.message).join(', ');
                throw new ServiceError(
                    `Failed to create PR: ${messages}`,
                    'github',
                    { originalError: error }
                );
            }

            throw error;
        }
    }

    /**
     * Show success notification and offer to open PR in browser
     * 
     * @param pr - Created PR details
     * @param isDraft - Whether PR is a draft
     */
    private async showSuccessNotification(
        pr: { number: number; html_url: string; draft?: boolean },
        isDraft: boolean
    ): Promise<void> {
        const prTypeStr = pr.draft || isDraft ? t('prTypes.draft') : t('prTypes.regular');

        const action = await vscode.window.showInformationMessage(
            t('messages.prCreatedSuccess', { prType: prTypeStr, number: pr.number }),
            t('buttons.openInBrowser')
        );

        if (action === t('buttons.openInBrowser')) {
            await vscode.env.openExternal(vscode.Uri.parse(pr.html_url));
        }
    }

    /**
     * Clean up preview files and tabs
     */
    private async cleanup(): Promise<void> {
        if (this.previewFile) {
            try {
                this.logger.debug('Cleaning up preview files');
                await closePreviewTabs();
                await cleanupPreviewFiles();
                this.previewFile = undefined;
            } catch (error) {
                this.logger.warning('Error cleaning up preview files', error);
            }
        }
    }
}
