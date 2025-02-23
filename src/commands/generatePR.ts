import * as vscode from 'vscode';
import { GitHubService } from '../services/github';
import { IssueInfo } from '../types/github';

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

        // Issue選択（オプション）
        let issueNumber: number | undefined;
        let initialTitle: string | undefined;
        let initialBody: string | undefined;

        const issues = await github.getIssues();
        if (issues.length > 0) {
            const issueItems = issues.map(issue => ({
                label: `#${issue.number} ${issue.title}`,
                description: issue.labels.join(', '),
                issue
            }));

            const selectedIssue = await vscode.window.showQuickPick(
                issueItems,
                {
                    placeHolder: 'Select related issue (optional)',
                    ignoreFocusOut: true
                }
            );

            if (selectedIssue) {
                issueNumber = selectedIssue.issue.number;
                initialTitle = selectedIssue.issue.title;
                initialBody = `Closes #${issueNumber}\n\n${selectedIssue.issue.body}`;
            }
        }

        // タイトル入力
        const title = await vscode.window.showInputBox({
            prompt: 'Enter pull request title',
            placeHolder: 'Feature: Add new functionality',
            value: initialTitle
        });

        if (!title) {
            return;
        }

        // 説明入力
        const description = await vscode.window.showInputBox({
            prompt: 'Enter pull request description (optional)',
            placeHolder: 'Describe your changes here...',
            value: initialBody
        });

        if (description === undefined) {
            return;
        }

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
                // Draft PRがサポートされていない場合は通知して通常のPRを作成
                if (error.message?.includes('Draft pull requests are not supported')) {
                    // 情報通知を表示
                    await vscode.window.showInformationMessage(
                        'Draft PRs are only available in GitHub Team and Enterprise. Creating a regular PR instead.'
                    );
                    
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

        // PR作成成功通知とブラウザで開くボタン
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