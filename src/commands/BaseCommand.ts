import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { ConfigManager } from '../infrastructure/config/ConfigManager';
import { StorageManager } from '../infrastructure/storage/StorageManager';
import { ErrorHandler, ErrorContext } from '../infrastructure/error/ErrorHandler';
import { OpenAIService } from '../services/openai';
import { ServiceError } from '../types/errors';
import { closePreviewTabs, cleanupPreviewFiles } from '../utils/preview';

/**
 * Abstract base class for all commands in the extension
 * 
 * Provides standardized command context including logger, config manager,
 * and storage manager. Also provides helper methods for common command
 * operations like progress notifications and error handling.
 * 
 * All command implementations should extend this class to ensure
 * consistent access to infrastructure services and error handling patterns.
 * 
 * @example
 * ```typescript
 * export class MyCommand extends BaseCommand {
 *   async execute(): Promise<void> {
 *     this.logger.info('Executing MyCommand');
 *     const config = this.config.get('language');
 *     const apiKey = await this.storage.getApiKey('openai');
 *     
 *     await this.withProgress('Processing...', async () => {
 *       // Command logic here
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseCommand {
    /** Logger instance for logging command operations */
    protected logger: Logger;

    /** Configuration manager for accessing extension settings */
    protected config: ConfigManager;

    /** Storage manager for accessing persistent data */
    protected storage: StorageManager;

    /** Preview file reference for markdown preview lifecycle */
    protected previewFile?: { uri: vscode.Uri; document: vscode.TextDocument };
    
    /**
     * Creates a new BaseCommand instance
     * 
     * @param context - The VS Code extension context
     */
    constructor(
        protected context: vscode.ExtensionContext
    ) {
        this.logger = Logger.getInstance();
        this.config = new ConfigManager();
        this.storage = new StorageManager(context);
    }
    
    /**
     * Execute the command
     * 
     * This method must be implemented by all command subclasses.
     * It contains the main logic for the command.
     * 
     * @param args - Arguments passed to the command
     * @returns A promise that resolves when the command completes
     */
    abstract execute(...args: unknown[]): Promise<void>;
    
    /**
     * Execute a task with a progress notification
     * 
     * Displays a progress notification to the user while the task is running.
     * Useful for long-running operations to provide user feedback.
     * 
     * @param title - The title to display in the progress notification
     * @param task - The async task to execute
     * @returns A promise that resolves with the task result
     * 
     * @example
     * ```typescript
     * const result = await this.withProgress('Generating commit message...', async () => {
     *   return await this.generateMessage();
     * });
     * ```
     */
    protected async withProgress<T>(
        title: string,
        task: () => Promise<T>
    ): Promise<T> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            task
        );
    }
    
    /**
     * Handle an error that occurred during command execution
     * 
     * Routes the error through the centralized ErrorHandler with
     * appropriate context information. This ensures consistent
     * error logging and user notifications across all commands.
     * 
     * @param error - The error that occurred
     * @param operation - Description of the operation that failed
     * 
     * @example
     * ```typescript
     * try {
     *   await this.performOperation();
     * } catch (error) {
     *   this.handleErrorSilently(error, 'performing operation');
     * }
     * ```
     */
    protected handleErrorSilently(error: unknown, operation: string): void {
        const context: ErrorContext = {
            operation,
            component: this.constructor.name
        };

        ErrorHandler.handle(error, context);
    }

    /**
     * Initialize OpenAI service with API key from storage
     *
     * @returns OpenAI service instance or undefined if initialization fails
     */
    protected async initializeOpenAI(): Promise<OpenAIService | undefined> {
        this.logger.debug('Initializing OpenAI service');

        try {
            const openai = await OpenAIService.initialize({
                language: this.config.get('language'),
                messageStyle: this.config.get('messageStyle'),
                useEmoji: this.config.get('useEmoji')
            }, this.context);

            if (!openai) {
                this.logger.info('OpenAI service initialization returned undefined');
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
     * Clean up preview files and tabs
     */
    protected async cleanupPreview(): Promise<void> {
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

    /**
     * Open an external URL safely (http/https only).
     *
     * @param url - The URL to open
     */
    protected async openExternalUrl(url: string): Promise<void> {
        try {
            const uri = vscode.Uri.parse(url);
            const scheme = uri.scheme.toLowerCase();

            if (scheme !== 'https' && scheme !== 'http') {
                this.logger.warning(`Blocked non-http(s) URL: ${url}`);
                vscode.window.showErrorMessage('Cannot open non-http(s) URL.');
                return;
            }

            await vscode.env.openExternal(uri);
        } catch (error) {
            this.logger.warning('Failed to open external URL', error);
            vscode.window.showErrorMessage('Failed to open link.');
        }
    }
}
