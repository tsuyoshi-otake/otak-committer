import { BaseCommand } from './BaseCommand';
import { GitService, GitServiceFactory } from '../services/git';
import { OpenAIService } from '../services/openai';
import { MessageStyle } from '../types/enums/MessageStyle';
import { TemplateInfo } from '../types';
import { detectPotentialSecrets, sanitizeCommitMessage } from '../utils';
import { t } from '../i18n/index.js';
import { isUserAbortError } from '../utils/errorHandling';
import { confirmProceedWithPotentialSecrets } from '../services/secretConfirmation';
import { showTimedNotification } from './commandNotifications';
import { processCommitDiff } from './commit.diffProcessing';
import { setCommitMessageInSourceControl } from './commitMessageInput';

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
    private signal?: AbortSignal;

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
     * @param signal - Optional AbortSignal to cancel the operation
     * @returns A promise that resolves when the command completes
     */
    async execute(signal?: AbortSignal): Promise<void> {
        this.signal = signal;
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

            if (!(await this.confirmIfPotentialSecrets(rawDiff))) {
                return;
            }

            // Initialize OpenAI service (moved earlier — needed for Tier 3 map-reduce)
            const openai = await this.initializeOpenAI();
            if (!openai) {
                return;
            }

            // Process diff through hybrid tier system
            const language = this.config.get('language') || 'english';
            const diffResult = await processCommitDiff({
                rawDiff,
                openai,
                language,
                signal: this.signal,
                logger: this.logger,
                withProgress: (title, task) => this.withProgress(title, task),
            });

            // Find commit message templates
            const templates = await this.findTemplates(git);

            // Generate commit message using processed diff
            const message = await this.generateMessage(
                openai,
                diffResult.processedDiff,
                templates.commit,
            );
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
            // Silently ignore abort errors (triggered by user pressing the button again)
            if (isUserAbortError(error)) {
                this.logger.info('Commit message generation cancelled by new request');
                return;
            }
            this.handleErrorSilently(error, t('operations.generatingCommitMessage'));
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
            await showTimedNotification(t('messages.noChangesToCommit'), 3000);
            return undefined;
        }

        return diff;
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
                    this.signal,
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
            await showTimedNotification(t('messages.emptyMessageReceived'), 3000);
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
     * Confirm before sending diffs that may contain secrets to an external model.
     */
    private async confirmIfPotentialSecrets(diff: string): Promise<boolean> {
        const detection = detectPotentialSecrets(diff);
        return confirmProceedWithPotentialSecrets(
            detection,
            this.logger,
            'Potential secrets detected in commit generation target',
            'messages.commitGenerationSecretWarning',
        );
    }

    /**
     * Set the generated commit message in the source control input box
     *
     * @param message - The commit message to set
     */
    private async setCommitMessage(message: string): Promise<void> {
        await setCommitMessageInSourceControl(message, this.logger);
    }

    /**
     * Show a success notification to the user
     */
    private async showSuccessNotification(): Promise<void> {
        await showTimedNotification(t('messages.commitMessageGenerated'), 3000);
    }
}
