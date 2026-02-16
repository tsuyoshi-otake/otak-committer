import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { GitService, GitServiceFactory } from '../services/git';
import { OpenAIService } from '../services/openai';
import { MessageStyle } from '../types/enums/MessageStyle';
import { sanitizeCommitMessage } from '../utils';
import { ServiceError } from '../types/errors';
import { t } from '../i18n/index.js';

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
     * 1. Initialize Git service and retrieve diff
     * 2. Find commit message templates (if any)
     * 3. Initialize OpenAI service with API key from storage
     * 4. Generate commit message using AI
     * 5. Sanitize and set the message in source control input
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

            // Get diff
            const diff = await this.getDiff(git);
            if (!diff) {
                return;
            }

            // Find commit message templates
            const templates = await this.findTemplates(git);

            // Initialize OpenAI service
            const openai = await this.initializeOpenAI();
            if (!openai) {
                return;
            }

            // Generate commit message
            const message = await this.generateMessage(openai, diff, templates.commit);
            if (!message) {
                return;
            }

            // Set message in source control
            await this.setCommitMessage(message);

            this.logger.info('Successfully generated and set commit message');
            await this.showSuccessNotification();

        } catch (error) {
            this.handleError(error, 'generating commit message');
        }
    }

    /**
     * Get the Git diff for staged changes
     * 
     * @returns The diff string or undefined if no changes
     */
    private async getDiff(git: GitService): Promise<string | undefined> {
        this.logger.debug('Getting Git diff');
        const diff = await git.getDiff();
        
        if (!diff) {
            this.logger.info('No changes to commit');
            await this.showNotification(t('messages.noChangesToCommit'), 3000);
            return undefined;
        }

        return diff;
    }

    /**
     * Find commit message templates in the repository
     * 
     * @returns Template information
     */
    private async findTemplates(git: GitService): Promise<{ commit?: any; pr?: any }> {
        this.logger.debug('Looking for commit message templates');

        return await git.findTemplates();
    }

    /**
     * Initialize OpenAI service with API key from storage
     * 
     * @returns OpenAI service instance or undefined if initialization fails
     */
    private async initializeOpenAI(): Promise<OpenAIService | undefined> {
        this.logger.debug('Initializing OpenAIService');

        try {
            const openai = await OpenAIService.initialize({
                language: this.config.get('language'),
                messageStyle: this.config.get('messageStyle'),
                useEmoji: this.config.get('useEmoji')
            }, this.context);

            if (!openai) {
                // OpenAIServiceFactory is responsible for prompting the user and showing errors.
                // Avoid double-notifying here (especially on user cancellation).
                this.logger.info('OpenAIService initialization returned undefined');
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
        template?: any
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
                    template
                );

                if (!generatedMessage) {
                    return undefined;
                }

                // Sanitize the message (escape dangerous characters, remove markdown blocks, etc.)
                return sanitizeCommitMessage(generatedMessage) || '';
            }
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
                cancellable: false
            },
            async () => {
                return new Promise<void>(resolve => {
                    setTimeout(resolve, duration);
                });
            }
        );
    }
}
