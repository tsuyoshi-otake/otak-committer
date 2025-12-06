import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { ConfigManager } from '../infrastructure/config/ConfigManager';
import { StorageManager } from '../infrastructure/storage/StorageManager';
import { ErrorHandler, ErrorContext } from '../infrastructure/error/ErrorHandler';

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
    abstract execute(...args: any[]): Promise<void>;
    
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
     *   this.handleError(error, 'performing operation');
     * }
     * ```
     */
    protected handleError(error: unknown, operation: string): void {
        const context: ErrorContext = {
            operation,
            component: this.constructor.name
        };
        
        ErrorHandler.handle(error, context);
    }
}
