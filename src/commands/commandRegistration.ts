import * as vscode from 'vscode';
import { CommandRegistry } from './CommandRegistry.js';
import { CommitCommand } from './CommitCommand.js';
import { PRCommand } from './PRCommand.js';
import { IssueCommand } from './IssueCommand.js';
import { ConfigCommand } from './ConfigCommand.js';
import { StorageManager } from '../infrastructure/storage/StorageManager.js';
import { StatusBarManager } from '../ui/StatusBarManager.js';

/**
 * Register all extension commands with the command registry
 * 
 * This function centralizes all command registration logic, keeping the
 * extension.ts entry point clean and focused on initialization.
 * 
 * @param registry - The command registry
 * @param context - The VS Code extension context
 * @param statusBar - The status bar manager
 */
export function registerAllCommands(
    registry: CommandRegistry,
    context: vscode.ExtensionContext,
    statusBar: StatusBarManager
): void {
    // Commit message generation
    registry.register({
        id: 'otak-committer.generateMessage',
        title: 'Generate Commit Message',
        category: 'otak-committer',
        handler: async () => {
            const command = new CommitCommand(context);
            await command.execute();
        }
    });

    // PR generation
    registry.register({
        id: 'otak-committer.generatePR',
        title: 'Generate Pull Request',
        category: 'otak-committer',
        handler: async () => {
            const command = new PRCommand(context);
            await command.execute();
        }
    });

    // Issue generation
    registry.register({
        id: 'otak-committer.generateIssue',
        title: 'Generate Issue',
        category: 'otak-committer',
        handler: async () => {
            const command = new IssueCommand(context);
            await command.execute();
        }
    });

    // Configuration commands
    const configCommand = new ConfigCommand(context);

    registry.register({
        id: 'otak-committer.changeLanguage',
        title: 'Change Language',
        category: 'otak-committer',
        handler: async () => {
            await configCommand.changeLanguage();
            statusBar.update();
        }
    });

    registry.register({
        id: 'otak-committer.changeMessageStyle',
        title: 'Change Message Style',
        category: 'otak-committer',
        handler: async () => {
            await configCommand.changeMessageStyle();
            statusBar.update();
        }
    });

    // Utility commands
    registry.register({
        id: 'otak-committer.openSettings',
        title: 'Open Settings',
        category: 'otak-committer',
        handler: () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'otakCommitter');
        }
    });

    registry.register({
        id: 'otak-committer.setApiKey',
        title: 'Set API Key',
        category: 'otak-committer',
        handler: async () => {
            const storage = new StorageManager(context);
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter your OpenAI API key',
                password: true,
                placeHolder: 'sk-...'
            });
            if (apiKey) {
                await storage.setApiKey('openai', apiKey);
                vscode.window.showInformationMessage('API key saved successfully');
            }
        }
    });
}
