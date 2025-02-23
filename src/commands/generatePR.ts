import * as vscode from 'vscode';
import { GitHubService } from '../services/github';
import { OpenAIService } from '../services/openai';
import { MESSAGE_STYLES } from '../types/messageStyle';
import { getCurrentLanguageConfig } from '../languages';

export async function generatePR(_context: vscode.ExtensionContext) {
    try {
        // ブランチ選択
        const branches = await GitHubService.selectBranches();
        if (!branches) {
            return;
        }

        // 差分取得
        const github = await GitHubService.initializeGitHubClient();
        if (!github) {
            return;
        }

        const diff = await github.getBranchDiff(branches.base, branches.compare);
        
        // OpenAI APIキーの確認
        const openai = await OpenAIService.initialize();
        if (!openai) {
            return;
        }

        // メッセージスタイルの取得
        const messageStyle = vscode.workspace.getConfiguration('otakCommitter').get<string>('messageStyle') || 'normal';
        const tokenLimit = MESSAGE_STYLES[messageStyle as keyof typeof MESSAGE_STYLES].tokens.pr;

        // 言語設定の取得
        const language = getCurrentLanguageConfig();

        // プログレス表示
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating PR description...',
            cancellable: false
        }, async () => {
            // PR説明の生成
            const prompt = `
以下の変更に基づいて、${language.name}でPull Requestのタイトルと説明を生成してください。
説明には以下の内容を含めてください：
- 変更の概要
- 変更の詳細
- 影響範囲
- テスト項目

変更内容：
${diff.files.map(file => `
${file.filename}:
${file.patch || 'Binary file changed'}
`).join('\n')}

Stats:
- Additions: ${diff.stats.additions}
- Deletions: ${diff.stats.deletions}
`;

            const response = await openai.createMessage(prompt, tokenLimit);
            if (!response) {
                return;
            }

            // PRの作成
            const lines = response.split('\n');
            const title = lines[0];
            const body = lines.slice(1).join('\n').trim();

            const pr = await github.createPullRequest({
                base: branches.base,
                compare: branches.compare,
                title,
                body
            });

            // 結果の表示
            const viewButton = 'View PR';
            const result = await vscode.window.showInformationMessage(
                `Pull Request #${pr.number} created successfully!`,
                viewButton
            );

            if (result === viewButton) {
                await vscode.env.openExternal(vscode.Uri.parse(pr.html_url));
            }
        });
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate PR: ${error.message}`);
    }
}