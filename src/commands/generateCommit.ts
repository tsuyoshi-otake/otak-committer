import * as vscode from 'vscode';
import { GitService } from '../services/git';
import { OpenAIService } from '../services/openai';
import { getCurrentLanguageConfig } from '../languages';
import { MESSAGE_STYLES } from '../types/messageStyle';

export async function generateCommit(_context: vscode.ExtensionContext) {
    try {
        // Git変更の取得
        const git = await GitService.initialize();
        if (!git) {
            return;
        }

        const changes = await git.getChanges();
        if (!changes || changes.length === 0) {
            vscode.window.showInformationMessage('No changes to commit.');
            return;
        }

        // OpenAI APIキーの確認
        const openai = await OpenAIService.initialize();
        if (!openai) {
            return;
        }

        // メッセージスタイルの取得
        const messageStyle = vscode.workspace.getConfiguration('otakCommitter').get<string>('messageStyle') || 'normal';
        const tokenLimit = MESSAGE_STYLES[messageStyle as keyof typeof MESSAGE_STYLES].tokens.commit;

        // 言語設定の取得
        const language = getCurrentLanguageConfig();

        // 未ステージングの変更を自動でステージング
        await git.stageAll();

        // プログレス表示
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating commit message...',
            cancellable: false
        }, async () => {
            // コミットメッセージの生成
            const prompt = `${language.systemPrompt(messageStyle as keyof typeof MESSAGE_STYLES)}

${language.diffMessage}
${changes.map(change => `
${change.file}:
${change.patch || 'Binary file changed'}`).join('\n')}

Stats:
- Added files: ${changes.filter(c => c.status === 'added').length}
- Modified files: ${changes.filter(c => c.status === 'modified').length}
- Deleted files: ${changes.filter(c => c.status === 'deleted').length}`;

            const message = await openai.createMessage(prompt, tokenLimit);
            if (!message) {
                return;
            }

            // コミットの実行
            await git.commit(message);

            // 成功メッセージの表示
            vscode.window.showInformationMessage('Successfully created commit with AI-generated message.');
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate commit message: ${error.message}`);
    }
}