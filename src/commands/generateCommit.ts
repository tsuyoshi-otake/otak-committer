import * as vscode from 'vscode';
import { GitService } from '../services/git';
import { OpenAIService } from '../services/openai';
import { MessageStyle } from '../types/messageStyle';
import { LANGUAGE_CONFIGS } from '../languages';

export async function generateCommit(context: vscode.ExtensionContext): Promise<void> {
    try {
        // Git差分の取得
        const git = await GitService.initialize();
        if (!git) {
            return;
        }

        const diff = await git.getDiff();
        if (!diff) {
            vscode.window.showWarningMessage('No changes to commit');
            return;
        }

        // OpenAI APIの初期化
        const openai = await OpenAIService.initialize();
        if (!openai) {
            return;
        }

        // 進捗表示
        const message = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating commit message...',
            cancellable: false
        }, async () => {
            // 設定を取得
            const config = vscode.workspace.getConfiguration('otakCommitter');
            const language = config.get<string>('language') || 'japanese';
            const messageStyle = config.get<MessageStyle>('messageStyle') || 'normal';

            // コミットメッセージを生成
            return await openai.generateCommitMessage(diff, language, messageStyle);
        });

        if (!message) {
            vscode.window.showErrorMessage('Failed to generate commit message');
            return;
        }

        // 生成されたメッセージをコミット
        await git.commit(message);

        vscode.window.showInformationMessage('Successfully committed changes');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate commit: ${error.message}`);
    }
}