import * as vscode from 'vscode';
import { CommandRegistry } from './CommandRegistry.js';
import type { StatusBarManager } from '../ui/StatusBarManager.js';

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
            const { CommitCommand } = await import('./CommitCommand.js');
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
            const { PRCommand } = await import('./PRCommand.js');
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
            const { IssueCommand } = await import('./IssueCommand.js');
            const command = new IssueCommand(context);
            await command.execute();
        }
    });

    registry.register({
        id: 'otak-committer.changeLanguage',
        title: 'Change Language',
        category: 'otak-committer',
        handler: async () => {
            const { ConfigCommand } = await import('./ConfigCommand.js');
            const configCommand = new ConfigCommand(context);
            await configCommand.changeLanguage();
            statusBar.update();
        }
    });

    registry.register({
        id: 'otak-committer.changeMessageStyle',
        title: 'Change Message Style',
        category: 'otak-committer',
        handler: async () => {
            const { ConfigCommand } = await import('./ConfigCommand.js');
            const configCommand = new ConfigCommand(context);
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
            const { StorageManager } = await import('../infrastructure/storage/StorageManager.js');
            const { ApiKeyManager } = await import('../services/ApiKeyManager.js');
            const storage = new StorageManager(context);
            const apiKeyManager = new ApiKeyManager(context, storage);
            await apiKeyManager.configureApiKey();
        }
    });

    registry.register({
        id: 'otak-committer.diagnoseStorage',
        title: 'Diagnose API Key Storage',
        category: 'otak-committer',
        handler: async () => {
            const { Logger } = await import('../infrastructure/logging/Logger.js');
            const logger = Logger.getInstance();

            logger.info('Storage diagnosis started');

            const legacyConfig = vscode.workspace.getConfiguration();

            const secretOpenAI = await context.secrets.get('openai.apiKey');
            const secretGitHub = await context.secrets.get('github.apiKey');

            const backupOpenAI = context.globalState.get<string>('otak-committer.backup.openai.apiKey');
            const backupGitHub = context.globalState.get<string>('otak-committer.backup.github.apiKey');

            const legacyOpenAI = (legacyConfig.get<string>('otakCommitter.openaiApiKey') || '').trim();
            const legacyGitHub = (legacyConfig.get<string>('otakCommitter.githubToken') || '').trim();

            logger.info('SecretStorage');
            logger.info(`- openai.apiKey: ${secretOpenAI ? 'present' : 'absent'} (${secretOpenAI?.length ?? 0} chars)`);
            logger.info(`- github.apiKey: ${secretGitHub ? 'present' : 'absent'} (${secretGitHub?.length ?? 0} chars)`);

            logger.info('GlobalState backup (encrypted)');
            logger.info(`- openai.apiKey: ${backupOpenAI ? 'present' : 'absent'} (${backupOpenAI?.length ?? 0} chars)`);
            logger.info(`- github.apiKey: ${backupGitHub ? 'present' : 'absent'} (${backupGitHub?.length ?? 0} chars)`);

            logger.info('Legacy settings');
            logger.info(`- otakCommitter.openaiApiKey: ${legacyOpenAI ? 'present' : 'absent'} (${legacyOpenAI.length} chars)`);
            logger.info(`- otakCommitter.githubToken: ${legacyGitHub ? 'present' : 'absent'} (${legacyGitHub.length} chars)`);

            logger.info('Storage diagnosis completed');
            logger.show();

            const { t } = await import('../i18n/index.js');
            vscode.window.showInformationMessage(t('messages.storageDiagnosisWritten'));
        }
    });
}
