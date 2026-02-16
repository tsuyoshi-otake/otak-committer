import * as vscode from 'vscode';
import { Logger, ConfigManager, StorageManager, ErrorHandler } from './infrastructure/index.js';
import { CommandRegistry } from './commands/CommandRegistry.js';
import { registerAllCommands } from './commands/commandRegistration.js';
import { StatusBarManager } from './ui/StatusBarManager.js';

let logger: Logger;
let statusBarManager: StatusBarManager;

/**
 * Activate the extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        logger = Logger.getInstance();
        logger.info('Activating otak-committer extension');

        const config = new ConfigManager();
        const storage = new StorageManager(context);

        await config.setDefaults();
        await storage.migrateFromLegacy();

        // Create status bar manager first (but don't initialize yet)
        statusBarManager = new StatusBarManager(context, config);

        // Register commands before initializing status bar
        // (status bar tooltip contains command links that must exist)
        const registry = new CommandRegistry();
        registerAllCommands(registry, context, statusBarManager);
        registry.registerAll(context);

        // Now initialize status bar (commands are available for tooltip links)
        statusBarManager.initialize();

        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('otakCommitter')) {
                    statusBarManager.update();
                }
            })
        );

        logger.info('Extension activated successfully');
    } catch (error) {
        ErrorHandler.handle(error, {
            operation: 'activating extension',
            component: 'extension'
        });
    }
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
    if (statusBarManager) {
        statusBarManager.dispose();
    }
    if (logger) {
        logger.info('Extension deactivated');
        logger.dispose();
    }
}
