import * as vscode from 'vscode';
import { GitHubService } from '../services/github';

export async function generatePR(context: vscode.ExtensionContext): Promise<void> {
    try {
        // ブランチ選択
        const branches = await GitHubService.selectBranches();
        if (!branches) {
            return;
        }

        // PR作成
        const github = await GitHubService.initializeGitHubClient();
        if (!github) {
            return;
        }

        // タイトル入力
        const title = await vscode.window.showInputBox({
            prompt: 'Enter pull request title',
            placeHolder: 'Feature: Add new functionality'
        });

        if (!title) {
            return;
        }

        // 説明入力
        const description = await vscode.window.showInputBox({
            prompt: 'Enter pull request description (optional)',
            placeHolder: 'Describe your changes here...'
        });

        if (description === undefined) {
            return;
        }

        // Issue番号入力（オプション）
        const issueInput = await vscode.window.showInputBox({
            prompt: 'Enter issue number (optional)',
            placeHolder: 'e.g. 123',
            validateInput: (value) => {
                if (value && !/^\d+$/.test(value)) {
                    return 'Please enter a valid issue number';
                }
                return null;
            }
        });

        const issueNumber = issueInput ? parseInt(issueInput, 10) : undefined;

        // 進行状況表示
        const result = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Creating Pull Request...',
            cancellable: false
        }, async () => {
            // まずDraftで試行
            try {
                return await github.createPullRequest({
                    base: branches.base,
                    compare: branches.compare,
                    title,
                    body: description,
                    issueNumber,
                    draft: true
                });
            } catch (error: any) {
                // Draft PRがサポートされていない場合は通常のPRとして作成
                if (error.message?.includes('Draft pull requests are not supported')) {
                    return await github.createPullRequest({
                        base: branches.base,
                        compare: branches.compare,
                        title,
                        body: description,
                        issueNumber,
                        draft: false
                    });
                }
                throw error;
            }
        });

        // PR作成成功通知
        const action = await vscode.window.showInformationMessage(
            `Pull Request #${result.number} created successfully!`,
            'Open in Browser'
        );

        if (action === 'Open in Browser') {
            await vscode.env.openExternal(vscode.Uri.parse(result.html_url));
        }

    } catch (error: any) {
        if (error.message === 'No changes to create a pull request') {
            vscode.window.showErrorMessage(
                'No changes found between selected branches. Please make some changes before creating a PR.'
            );
            return;
        }

        // GitHubApiError
        if (error.response?.errors) {
            const messages = error.response.errors.map((e: any) => e.message).join(', ');
            vscode.window.showErrorMessage(`Failed to generate PR: ${messages}`);
            return;
        }

        vscode.window.showErrorMessage(`Failed to generate PR: ${error.message}`);
    }
}