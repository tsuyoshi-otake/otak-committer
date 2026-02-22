import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { GitHubService, GitHubServiceFactory } from '../services/github';
import { BranchSelector, BranchSelection } from '../services/branch';
import { OpenAIService } from '../services/openai';
import { GitServiceFactory } from '../services/git';
import { ServiceError } from '../types/errors';
import { PullRequestDiff, TemplateInfo } from '../types';
import { detectPotentialSecrets } from '../utils';
import { t } from '../i18n/index.js';
import { selectIssue, selectPRType } from './pr.input';
import { showPRPreview } from './pr.preview';
import { createPRWithDraftFallback } from './pr.creation';
import { handleCreatePRError } from './pr.error';

export class PRCommand extends BaseCommand {
    async execute(): Promise<void> {
        try {
            this.logger.info('Starting PR generation');

            const github = await this.initializeGitHub();
            if (!github) {
                return;
            }

            const branches = await this.selectBranches(github);
            if (!branches) {
                return;
            }

            const issueNumber = await selectIssue(github, this.logger);
            const templates = await this.findTemplates();
            const diff = await this.getBranchDiff(github, branches);
            if (!diff) {
                return;
            }

            if (this.shouldBlockForPotentialSecrets(diff)) {
                return;
            }

            const openai = await this.initializeOpenAI();
            if (!openai) {
                return;
            }

            const prContent = await this.generatePRContent(openai, diff, templates.pr);
            if (!prContent) {
                return;
            }

            const previewSuccess = await this.showPreview(prContent, issueNumber);
            if (!previewSuccess) {
                return;
            }

            const prType = await selectPRType(this.logger);
            if (!prType) {
                return;
            }

            await this.createPR(github, branches, prContent, issueNumber, prType.value);
            this.logger.info('Successfully created PR');
        } catch (error) {
            this.handleErrorSilently(error, 'generating pull request');
        } finally {
            await this.cleanupPreview();
        }
    }

    private async selectBranches(github: GitHubService): Promise<BranchSelection | undefined> {
        this.logger.debug('Selecting branches for PR');
        const branches = await BranchSelector.selectBranches(github);
        if (!branches) {
            this.logger.info('Branch selection cancelled');
            return undefined;
        }
        this.logger.debug(`Selected branches: ${branches.base} <- ${branches.compare}`);
        return branches;
    }

    private async initializeGitHub(): Promise<GitHubService | undefined> {
        this.logger.debug('Initializing GitHub service');
        const github = await GitHubServiceFactory.initialize();
        if (!github) {
            this.logger.error('Failed to initialize GitHub service');
            return undefined;
        }
        return github;
    }

    private async findTemplates(): Promise<{ commit?: TemplateInfo; pr?: TemplateInfo }> {
        this.logger.debug('Looking for PR templates');
        const git = await GitServiceFactory.initialize();
        if (!git) {
            return {};
        }
        return git.findTemplates();
    }

    private async getBranchDiff(
        github: GitHubService,
        branches: BranchSelection,
    ): Promise<PullRequestDiff | undefined> {
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
            throw new ServiceError('Failed to get branch diff', 'github', { originalError: error });
        }
    }

    private async generatePRContent(
        openai: OpenAIService,
        diff: PullRequestDiff,
        template?: TemplateInfo,
    ): Promise<{ title: string; body: string } | undefined> {
        this.logger.debug('Generating PR content with AI');

        const prContent = await this.withProgress(t('progress.analyzingChanges'), async () => {
            const language = this.config.get('language') || 'english';
            this.logger.debug(`Using language: ${language}`);
            return openai.generatePRContent(diff, language, template);
        });

        if (!prContent) {
            this.logger.error('Failed to generate PR content');
            vscode.window.showErrorMessage(t('messages.failedToGeneratePR'));
            return undefined;
        }
        return prContent;
    }

    private async showPreview(
        prContent: { title: string; body: string },
        issueNumber?: number,
    ): Promise<boolean> {
        this.logger.debug('Showing PR preview');

        this.previewFile = await showPRPreview(prContent, issueNumber);
        if (!this.previewFile) {
            this.logger.error('Failed to show preview');
            vscode.window.showErrorMessage(t('messages.failedToShowPreview'));
            return false;
        }
        return true;
    }

    private async createPR(
        github: GitHubService,
        branches: BranchSelection,
        prContent: { title: string; body: string },
        issueNumber: number | undefined,
        isDraft: boolean,
    ): Promise<void> {
        this.logger.debug('Creating PR on GitHub');

        const description = issueNumber
            ? `${prContent.body}\n\nResolves #${issueNumber}`
            : prContent.body;
        const prTypeStr = isDraft ? t('prTypes.draft') : t('prTypes.regular');
        const params = {
            base: branches.base,
            compare: branches.compare,
            title: prContent.title,
            body: description,
            issueNumber,
            draft: isDraft,
        };

        try {
            const result = await this.withProgress(t('progress.creatingPR', { prType: prTypeStr }), () =>
                createPRWithDraftFallback(github, params, isDraft, this.logger),
            );

            if (!result?.number) {
                throw new Error('PR creation failed: No PR details received');
            }
            await this.showSuccessNotification(result, isDraft);
        } catch (error: unknown) {
            handleCreatePRError(error);
        }
    }

    private shouldBlockForPotentialSecrets(diff: PullRequestDiff): boolean {
        const combined = diff.files.map((f) => f.patch).join('\n');
        const detection = detectPotentialSecrets(combined);
        if (!detection.hasPotentialSecrets) {
            return false;
        }

        const patterns = detection.matchedPatternIds.join(', ');
        this.logger.warning('Potential secrets detected in PR diff', {
            matchedPatternIds: detection.matchedPatternIds,
        });

        vscode.window.showWarningMessage(
            t('messages.commitGenerationSecretWarning', {
                count: detection.matchedPatternIds.length,
                patterns,
            }),
        );

        return true;
    }

    private async showSuccessNotification(
        pr: { number: number; html_url: string; draft?: boolean },
        isDraft: boolean,
    ): Promise<void> {
        const prTypeStr = pr.draft || isDraft ? t('prTypes.draft') : t('prTypes.regular');
        const action = await vscode.window.showInformationMessage(
            t('messages.prCreatedSuccess', { prType: prTypeStr, number: pr.number }),
            t('buttons.openInBrowser'),
        );

        if (action === t('buttons.openInBrowser')) {
            await this.openExternalUrl(pr.html_url);
        }
    }
}
