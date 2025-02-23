import * as vscode from 'vscode';
import { GitService } from '../services/git';
import { OpenAIService } from '../services/openai';
import { MessageStyle } from '../types/messageStyle';

export async function generateCommit(): Promise<void> {
    try {
        console.log('Starting generateCommit command...');

        // Gitソースコントロールを取得
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            vscode.window.showErrorMessage('Git extension is not available');
            return;
        }

        const git = gitExtension.exports.getAPI(1);
        const repository = git.repositories[0];
        if (!repository) {
            vscode.window.showErrorMessage('No Git repository found');
            return;
        }

        // Git差分の取得
        console.log('Initializing GitService...');
        const gitService = await GitService.initialize();
        if (!gitService) {
            return;
        }

        console.log('Getting Git diff...');
        const diff = await gitService.getDiff();
        if (!diff) {
            console.log('No changes to commit');
            vscode.window.showWarningMessage('No changes to commit');
            return;
        }

        // OpenAI APIの初期化
        console.log('Initializing OpenAIService...');
        const openai = await OpenAIService.initialize();
        if (!openai) {
            console.error('Failed to initialize OpenAIService');
            return;
        }

        // 進捗表示
        console.log('Starting commit message generation...');
        const message = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating commit message...',
            cancellable: false
        }, async () => {
            // 設定を取得
            const config = vscode.workspace.getConfiguration('otakCommitter');
            const language = config.get<string>('language') || 'japanese';
            const messageStyle = config.get<MessageStyle>('messageStyle') || 'normal';

            console.log(`Using language: ${language}, style: ${messageStyle}`);

            // コミットメッセージを生成
            return await openai.generateCommitMessage(diff, language, messageStyle);
        });

        if (!message) {
            console.error('Failed to generate commit message: message is empty');
            vscode.window.showErrorMessage('Failed to generate commit message');
            return;
        }

        // 生成されたメッセージをソースコントロールのインプットボックスに設定
        console.log('Setting generated message to source control input...');
        repository.inputBox.value = message;

        console.log('Successfully set commit message');
        vscode.window.showInformationMessage('Commit message has been generated');
    } catch (error: any) {
        console.error('Error in generateCommit:', error);
        vscode.window.showErrorMessage(`Failed to generate commit: ${error.message}`);
    }
}