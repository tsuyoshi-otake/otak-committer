import * as vscode from 'vscode';
import { ErrorHandler } from '../infrastructure/error/ErrorHandler';
import { Logger } from '../infrastructure/logging/Logger';

/**
 * Command interface for registering commands with the CommandRegistry
 * 
 * Defines the structure for commands that can be registered with VS Code.
 * Each command has an ID, handler function, title, and optional category.
 */
export interface Command {
    /** The unique identifier for the command (e.g., 'otakCommitter.generateCommit') */
    id: string;
    
    /** The function to execute when the command is invoked */
    handler: (...args: any[]) => Promise<void> | void;
    
    /** The human-readable title for the command */
    title: string;
    
    /** Optional category for grouping related commands */
    category?: string;
}

/**
 * Centralized command registry for managing VS Code command registration
 * 
 * Provides a unified interface for registering commands with automatic
 * error handling and logging. All commands registered through this registry
 * will have consistent error handling behavior.
 * 
 * @example
 * ```typescript
 * const registry = new CommandRegistry();
 * 
 * registry.register({
 *   id: 'myExtension.myCommand',
 *   title: 'My Command',
 *   handler: async () => {
 *     // Command implementation
 *   }
 * });
 * 
 * registry.registerAll(context);
 * ```
 */
export class CommandRegistry {
    private commands: Map<string, Command> = new Map();
    private logger: Logger;
    
    /**
     * Creates a new CommandRegistry instance
     */
    constructor() {
        this.logger = Logger.getInstance();
    }
    
    /**
     * Register a single command with the registry
     * 
     * The command will not be registered with VS Code until registerAll() is called.
     * This allows for batch registration of all commands during extension activation.
     * 
     * @param command - The command to register
     * @throws Error if a command with the same ID is already registered
     * 
     * @example
     * ```typescript
     * registry.register({
     *   id: 'myExtension.myCommand',
     *   title: 'My Command',
     *   category: 'My Category',
     *   handler: async () => {
     *     console.log('Command executed');
     *   }
     * });
     * ```
     */
    register(command: Command): void {
        if (this.commands.has(command.id)) {
            const error = new Error(`Command with ID '${command.id}' is already registered`);
            this.logger.warning(`Attempted to register duplicate command: ${command.id}`);
            throw error;
        }
        
        this.commands.set(command.id, command);
        this.logger.debug(`Registered command: ${command.id} (${command.title})`);
    }
    
    /**
     * Register all commands with VS Code
     * 
     * Iterates through all registered commands and registers them with VS Code's
     * command system. Each command is wrapped with centralized error handling
     * to ensure consistent error behavior across all commands.
     * 
     * All command disposables are added to the extension context's subscriptions
     * for automatic cleanup when the extension is deactivated.
     * 
     * @param context - The VS Code extension context
     * 
     * @example
     * ```typescript
     * export function activate(context: vscode.ExtensionContext) {
     *   const registry = new CommandRegistry();
     *   
     *   // Register commands
     *   registry.register({ ... });
     *   registry.register({ ... });
     *   
     *   // Register all with VS Code
     *   registry.registerAll(context);
     * }
     * ```
     */
    registerAll(context: vscode.ExtensionContext): void {
        this.logger.info(`Registering ${this.commands.size} commands with VS Code`);
        
        for (const [id, command] of this.commands) {
            const disposable = vscode.commands.registerCommand(
                id,
                async (...args: any[]) => {
                    this.logger.debug(`Executing command: ${id}`);
                    
                    try {
                        await command.handler(...args);
                        this.logger.debug(`Command completed successfully: ${id}`);
                    } catch (error) {
                        this.logger.error(`Command failed: ${id}`, error);
                        
                        ErrorHandler.handle(error, {
                            operation: `executing command '${command.title}'`,
                            component: 'CommandRegistry',
                            metadata: {
                                commandId: id,
                                commandTitle: command.title,
                                commandCategory: command.category
                            }
                        });
                    }
                }
            );
            
            context.subscriptions.push(disposable);
        }
        
        this.logger.info('All commands registered successfully');
    }
    
    /**
     * Get the number of registered commands
     * 
     * @returns The number of commands currently registered
     */
    getCommandCount(): number {
        return this.commands.size;
    }
    
    /**
     * Check if a command with the given ID is registered
     * 
     * @param id - The command ID to check
     * @returns True if the command is registered, false otherwise
     */
    hasCommand(id: string): boolean {
        return this.commands.has(id);
    }
    
    /**
     * Get all registered command IDs
     * 
     * @returns An array of all registered command IDs
     */
    getCommandIds(): string[] {
        return Array.from(this.commands.keys());
    }
}
