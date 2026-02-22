import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { GitService, GitServiceFactory } from '../services/git';
import { OpenAIService } from '../services/openai';
import { MessageStyle } from '../types/enums/MessageStyle';
import { TemplateInfo } from '../types';
import { detectPotentialSecrets, sanitizeCommitMessage } from '../utils';
import { t } from '../i18n/index.js';
import type { DiffProcessResult } from '../services/diffProcessor';

/**
 * Command for generating commit messages using AI
 *
 * This command analyzes the current Git diff and generates an appropriate
 * commit message using OpenAI's API. It handles the entire workflow from
 * retrieving the diff to setting the message in the source control input box.
 *
 * @example
 * ```typescript
 * const command = new CommitCommand(context);
 * await command.execute();
 * ```
 */
export class CommitCommand extends BaseCommand {
    /**
     * Execute the commit message generation command
     *
     * Workflow:
     * 1. Initialize Git service and retrieve raw diff
     * 2. Check for potential secrets
     * 3. Initialize OpenAI service (needed early for Tier 3 map-reduce)
     * 4. Process diff through hybrid tier system (Tier 1/2/3)
     * 5. Find commit message templates (if any)
     * 6. Generate commit message using AI
     * 7. Sanitize and set the message in source control input
     *
     * @returns A promise that resolves when the command completes
     */
    async execute(): Promise<void> {
        try {
            this.logger.info('Starting commit message generation');

            // Initialize Git service once and reuse for diff + templates
            const git = await GitServiceFactory.initialize();
            if (!git) {
                this.logger.error('Failed to initialize GitService');
                return;
            }

            // Get raw diff (without truncation — DiffProcessor handles token management)
            const rawDiff = await this.getRawDiff(git);
            if (!rawDiff) {
                return;
            }

            if (await this.shouldBlockForPotentialSecrets(rawDiff)) {
                return;
            }

            // Initialize OpenAI service (moved earlier — needed for Tier 3 map-reduce)
            const openai = await this.initializeOpenAI();
            if (!openai) {
                return;
            }

            // Process diff through hybrid tier system
            const language = this.config.get('language') || 'english';
            const diffResult = await this.processDiff(rawDiff, openai, language);

            // Find commit message templates
            const templates = await this.findTemplates(git);

            // Generate commit message using processed diff
            const message = await this.generateMessage(openai, diffResult.processedDiff, templates.commit);
            if (!message) {
                return;
            }

            // Append trailer if enabled
            const finalMessage = this.appendTrailerIfEnabled(message);

            // Set message in source control
            await this.setCommitMessage(finalMessage);

            this.logger.info('Successfully generated and set commit message');
            await this.showSuccessNotification();
        } catch (error) {
            this.handleErrorSilently(error, 'generating commit message');
        }
    }

    /**
     * Get the raw Git diff without truncation
     *
     * @returns The raw diff string or undefined if no changes
     */
    private async getRawDiff(git: GitService): Promise<string | undefined> {
        this.logger.debug('Getting raw Git diff');
        const diff = await git.getRawDiff(this.context.globalState);

        if (!diff) {
            this.logger.info('No changes to commit');
            await this.showNotification(t('messages.noChangesToCommit'), 3000);
            return undefined;
        }

        return diff;
    }

    /**
     * Process diff through the hybrid tier system (Tier 1/2/3)
     *
     * @param rawDiff - The raw Git diff string
     * @param openai - OpenAI service instance (needed for Tier 3 map-reduce)
     * @param language - The configured language for summarization
     * @returns The processed diff result with tier information
     */
    private async processDiff(
        rawDiff: string,
        openai: OpenAIService,
        language: string,
    ): Promise<DiffProcessResult> {
        const { DiffProcessor } = await import('../services/diffProcessor');
        const { DiffTier } = await import('../services/diffProcessor');
        const { TokenManager } = await import('../services/tokenManager');

        const tokenBudget = TokenManager.getConfiguredMaxTokens();
        const processor = new DiffProcessor(
            openai,
            language,
            (msg) => this.logger.info(`Map-reduce progress: ${msg}`),
        );

        const result = await this.withProgress<DiffProcessResult>(
            t('progress.processingLargeDiff'),
            async () => processor.process(rawDiff, tokenBudget),
        );

        // Log the tier used
        if (result.tier === DiffTier.SmartPrioritized) {
            const tokenCount = Math.floor(rawDiff.length / 4 / 1000);
            this.logger.info(
                t('git.smartDiffApplied', {
                    tokenCount,
                    included: result.includedFiles,
                    total: result.totalFiles,
                }),
            );
        } else if (result.tier === DiffTier.MapReduce) {
            const tokenCount = Math.floor(rawDiff.length / 4 / 1000);
            this.logger.info(
                t('git.mapReduceApplied', {
                    tokenCount,
                    chunks: result.excludedFiles,
                }),
            );
        }

        return result;
    }

    /**
     * Find commit message templates in the repository
     *
     * @returns Template information
     */
    private async findTemplates(
        git: GitService,
    ): Promise<{ commit?: TemplateInfo; pr?: TemplateInfo }> {
        this.logger.debug('Looking for commit message templates');

        return await git.findTemplates();
    }

    /**
     * Generate commit message using OpenAI
     *
     * @param openai - OpenAI service instance
     * @param diff - Git diff string
     * @param template - Optional commit message template
     * @returns Generated commit message or undefined if generation fails
     */
    private async generateMessage(
        openai: OpenAIService,
        diff: string,
        template?: TemplateInfo,
    ): Promise<string | undefined> {
        this.logger.debug('Starting commit message generation');

        const message = await this.withProgress<string | undefined>(
            t('progress.generatingCommitMessage'),
            async () => {
                // Get configuration - use otakCommitter.language setting
                const language = this.config.get('language') || 'english';
                const messageStyle = this.config.get('messageStyle') || MessageStyle.Normal;

                this.logger.debug(`Using language: ${language}, style: ${messageStyle}`);

                // Generate commit message
                const generatedMessage = await openai.generateCommitMessage(
                    diff,
                    language,
                    messageStyle,
                    template,
                );

                if (!generatedMessage) {
                    return undefined;
                }

                // Sanitize the message (escape dangerous characters, remove markdown blocks, etc.)
                return sanitizeCommitMessage(generatedMessage) || '';
            },
        );

        if (message === undefined) {
            // OpenAIService already surfaced an error or the user cancelled key setup.
            return undefined;
        }

        if (!message) {
            this.logger.error('Failed to generate commit message: message is empty');
            await this.showNotification(t('messages.emptyMessageReceived'), 3000);
            return undefined;
        }

        return message;
    }

    /**
     * Append the Commit-Message-By trailer if the setting is enabled
     */
    private appendTrailerIfEnabled(message: string): string {
        const appendTrailer = this.config.get('appendCommitTrailer') ?? true;
        if (!appendTrailer) {
            return message;
        }
        return `${message}\n\nCommit-Message-By: otak-committer`;
    }

    /**
     * Detect potential secrets in diff before sending content to AI.
     *
     * @returns true when commit message generation should be blocked
     */
    private async shouldBlockForPotentialSecrets(diff: string): Promise<boolean> {
        const detection = detectPotentialSecrets(diff);
        if (!detection.hasPotentialSecrets) {
            return false;
        }

        const patterns = detection.matchedPatternIds.join(', ');

        this.logger.warning('Potential secrets detected in commit generation target', {
            matchedPatternIds: detection.matchedPatternIds,
        });

        await vscode.window.showWarningMessage(
            t('messages.commitGenerationSecretWarning', {
                count: detection.matchedPatternIds.length,
                patterns,
            }),
        );

        return true;
    }

    /**
     * Set the generated commit message in the source control input box
     *
     * @param message - The commit message to set
     */
    private async setCommitMessage(message: string): Promise<void> {
        this.logger.debug('Setting generated message to source control input');

        // Get Git extension
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            this.logger.error('Git extension not found');
            throw new Error('Git extension is not available');
        }

        // Get Git API
        const gitApi = gitExtension.exports.getAPI(1);
        const repository = gitApi.repositories[0];

        if (!repository) {
            this.logger.error('No Git repository found');
            throw new Error('No Git repository found');
        }

        // Set the message in the input box
        repository.inputBox.value = message;
        this.logger.debug('Successfully set commit message');
    }

    /**
     * Show a success notification to the user
     */
    private async showSuccessNotification(): Promise<void> {
        await this.showNotification(t('messages.commitMessageGenerated'), 3000);
    }

    /**
     * Show a notification to the user for a specified duration
     *
     * @param title - The notification title
     * @param duration - Duration in milliseconds
     */
    private async showNotification(title: string, duration: number): Promise<void> {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false,
            },
            async () => {
                return new Promise<void>((resolve) => {
                    setTimeout(resolve, duration);
                });
            },
        );
    }
}
