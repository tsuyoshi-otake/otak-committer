import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { GitServiceFactory } from '../services/git';
import { OpenAIService } from '../services/openai';
import { MessageStyle } from '../types/enums/MessageStyle';
import { sanitizeCommitMessage } from '../utils';
import { ServiceError } from '../types/errors';

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

            // Initialize Git service and get diff
            const diff = await this.getDiff();
            if (!diff) {
                return;
            }

            // Find commit message templates
            const templates = await this.findTemplates();

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
    private async getDiff(): Promise<string | undefined> {
        this.logger.debug('Initializing GitService');
        
        const git = await GitServiceFactory.initialize();
        if (!git) {
            this.logger.error('Failed to initialize GitService');
            return undefined;
        }

        this.logger.debug('Getting Git diff');
        const diff = await git.getDiff();
        
        if (!diff) {
            this.logger.info('No changes to commit');
            await this.showNotification('No changes to commit', 3000);
            return undefined;
        }

        return diff;
    }

    /**
     * Find commit message templates in the repository
     * 
     * @returns Template information
     */
    private async findTemplates(): Promise<{ commit?: any; pr?: any }> {
        this.logger.debug('Looking for commit message templates');
        
        const git = await GitServiceFactory.initialize();
        if (!git) {
            return {};
        }

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
            // Get API key from storage
            const apiKey = await this.storage.getApiKey('openai');

            if (!apiKey) {
                this.logger.warning('OpenAI API key not found in storage');
                
                const configured = await vscode.window.showWarningMessage(
                    'OpenAI API key is not configured. Would you like to configure it now?',
                    'Yes',
                    'No'
                );

                if (configured === 'Yes') {
                    await vscode.commands.executeCommand(
                        'workbench.action.openSettings',
                        'otakCommitter.openaiApiKey'
                    );
                }

                return undefined;
            }

            // Initialize service with API key
            const openai = await OpenAIService.initialize({
                openaiApiKey: apiKey,
                language: this.config.get('language'),
                messageStyle: this.config.get('messageStyle'),
                useEmoji: this.config.get('useEmoji')
            }, this.context);

            if (!openai) {
                this.logger.error('Failed to initialize OpenAIService');
                await this.showNotification('OpenAI service initialization failed', 3000);
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

        const message = await this.withProgress(
            'Generating commit message...',
            async () => {
                // Get configuration
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
                    return '';
                }

                // Sanitize the message (escape dangerous characters, remove markdown blocks, etc.)
                return sanitizeCommitMessage(generatedMessage);
            }
        );

        if (!message) {
            this.logger.error('Failed to generate commit message: message is empty');
            await this.showNotification('Empty message received', 3000);
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
        await this.showNotification('Commit message has been generated', 3000);
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
