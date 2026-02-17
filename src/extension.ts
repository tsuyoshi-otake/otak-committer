import * as vscode from 'vscode';
import { Logger, ConfigManager, StorageManager, ErrorHandler } from './infrastructure/index.js';
import { CommandRegistry } from './commands/CommandRegistry.js';
import { registerAllCommands } from './commands/commandRegistration.js';
import { StatusBarManager } from './ui/StatusBarManager.js';

class ExtensionApp {
    private readonly logger: Logger;
    private readonly config: ConfigManager;
    private readonly storage: StorageManager;
    private readonly statusBarManager: StatusBarManager;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.logger = Logger.getInstance();
        this.config = new ConfigManager();
        this.storage = new StorageManager(context);
        this.statusBarManager = new StatusBarManager(context, this.config);
    }

    async activate(): Promise<void> {
        this.logger.info('Activating otak-committer extension');

        await this.config.setDefaults();
        await this.storage.migrateFromLegacy();
        await this.storage.configureSettingsSync();

        // Register commands before initializing status bar.
        // (status bar tooltip contains command links that must exist)
        const registry = new CommandRegistry();
        registerAllCommands(registry, this.context, this.statusBarManager);
        registry.registerAll(this.context);

        // Now initialize status bar (commands are available for tooltip links)
        this.statusBarManager.initialize();

        this.context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('otakCommitter')) {
                    this.statusBarManager.update();
                }

                if (e.affectsConfiguration('otakCommitter.syncApiKeys')) {
                    void this.storage.configureSettingsSync();
                }
            }),
        );

        this.logger.info('Extension activated successfully');
    }

    deactivate(): void {
        this.statusBarManager.dispose();
        this.logger.info('Extension deactivated');
        this.logger.dispose();
    }
}

let app: ExtensionApp | undefined;

/**
 * Activate the extension
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    try {
        app = new ExtensionApp(context);
        await app.activate();
    } catch (error) {
        ErrorHandler.handle(error, {
            operation: 'activating extension',
            component: 'extension',
        });
    }
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
    app?.deactivate();
    app = undefined;
}
