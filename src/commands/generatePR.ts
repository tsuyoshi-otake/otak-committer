import * as vscode from 'vscode';
import { GitHubService, GitHubServiceFactory } from '../services/github';
import { OpenAIService } from '../services/openai';
import { GitService, GitServiceFactory } from '../services/git';

interface Issue {
    number: number;
    title: string;
    labels: string[];
    html_url?: string;
}

export async function generatePR(): Promise<void> {
    let previewFile: { uri: vscode.Uri, document: vscode.TextDocument } | undefined;

    try {
        // ブランチ選択
        const branches = await GitHubService.selectBranches();
        if (!branches) {
            return;
        }

        // PR作成
        const github = await GitHubServiceFactory.initialize();
        if (!github) {
            return;
        }

        // Issue選択（オプション、Escapeでスキップ可能）
        let issueNumber: number | undefined;

        const issues = await github.getIssues();
        if (issues.length > 0) {
            const issueItems = issues.map((issue: Issue) => ({
                label: `#${issue.number} ${issue.title}`,
                description: issue.labels.join(', '),
                issue
            }));

            const selectedIssue = await vscode.window.showQuickPick(
                issueItems,
                {
                    placeHolder: 'Select related issue (optional, press Escape to skip)',
                    ignoreFocusOut: true
                }
            );

            if (selectedIssue) {
                issueNumber = selectedIssue.issue.number;
            }
        }

        // GitServiceの初期化
        const gitService = await GitServiceFactory.initialize();
        if (!gitService) {
            return;
        }

        // テンプレートを探す
        const templates = await gitService.findTemplates();

        // 差分を取得
        const diff = await github.getBranchDiffDetails(branches.base, branches.compare);
        
        // GPT-4oを使用してPRの内容を自動生成
        const openai = await OpenAIService.initialize();
        if (!openai) {
            return;
        }

        const language = vscode.workspace.getConfiguration('otakCommitter').get<string>('language') || 'english';
        
        // GPT-4oでタイトルと説明を生成
        let generatedPR;
        try {
            generatedPR = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generate Pull Request - Analyzing changes...',
                cancellable: false
            }, async (progress) => {
                progress.report({ message: 'Generating content using AI...' });
                // Issue情報を含めて生成
                const result = await openai.generatePRContent(
                    diff,
                    language,
                    templates.pr
                );
                progress.report({ message: 'Content generated successfully' });
                return result;
            });

            if (!generatedPR) {
                vscode.window.showErrorMessage('Failed to generate PR content. Please try again.');
                return;
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error generating PR content: ${error.message}`);
            console.error('PR generation error:', error);
            return;
        }

        // Markdownプレビューを表示
        let previewContent = `${generatedPR.title}\n\n---\n\n${generatedPR.body}`;
        if (issueNumber) {
            previewContent += `\n\nResolves #${issueNumber}`;
        }
        previewFile = await showMarkdownPreview(previewContent);
        if (!previewFile) {
            vscode.window.showErrorMessage('Failed to show preview');
            return;
        }

        // PR種別の選択（DraftかRegularか）
        const prType = await vscode.window.showQuickPick(
            [
                { label: 'Draft Pull Request', description: 'Review required before merge', value: true },
                { label: 'Regular Pull Request', description: 'Ready for review and merge', value: false }
            ],
            {
                placeHolder: 'Select PR type (press Escape to skip)',
                ignoreFocusOut: true
            }
        );

        if (!prType) {
            return;
        }

        // 生成されたタイトルと説明を使用
        const title = generatedPR.title;
        const description = issueNumber 
            ? `${generatedPR.body}\n\nResolves #${issueNumber}`
            : generatedPR.body;

        try {
            // PR作成の進行状況表示
            const result = await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Creating ${prType.value ? 'Draft' : 'Regular'} Pull Request...`,
                cancellable: false
            }, async (progress) => {
                // まずブランチの変更を再確認
                progress.report({ message: 'Validating branch changes...' });
                const changes = await github.getBranchDiffDetails(branches.base, branches.compare);
                if (!changes.files.length) {
                    throw new Error('No changes to create a pull request');
                }

                try {
                    progress.report({ message: 'Creating PR on GitHub...' });
                    console.log('Creating PR with params:', {
                        base: branches.base,
                        compare: branches.compare,
                        title,
                        issueNumber,
                        draft: prType.value
                    });

                    const pr = await github.createPullRequest({
                        base: branches.base,
                        compare: branches.compare,
                        title,
                        body: description,
                        issueNumber,
                        draft: prType.value
                    });

                    if (!pr || !pr.number) {
                        throw new Error('Failed to create PR: Invalid response from GitHub');
                    }

                    progress.report({ message: `PR #${pr.number} created successfully!` });
                    return pr;

                } catch (error: any) {
                    // Draft PRがサポートされていない場合は通常のPRを試行
                    if (prType.value && error.message?.includes('Draft pull requests are not supported')) {
                        progress.report({ message: 'Draft PR not supported, creating regular PR...' });
                        await vscode.window.showInformationMessage(
                            'Draft PRs are only available in GitHub Team and Enterprise. Creating a regular PR instead.'
                        );
                        
                        const regularPr = await github.createPullRequest({
                            base: branches.base,
                            compare: branches.compare,
                            title,
                            body: description,
                            issueNumber,
                            draft: false
                        });

                        if (!regularPr || !regularPr.number) {
                            throw new Error('Failed to create regular PR: Invalid response from GitHub');
                        }

                        progress.report({ message: `Regular PR #${regularPr.number} created successfully!` });
                        return regularPr;
                    }
                    throw error;
                }
            });

            // PR作成成功後、プレビューを閉じてブラウザでの表示オプションを提供
            if (result && result.number) {
                // プレビューを閉じてクリーンアップ
                await closePreviewTabs();
                await cleanupPreviewFiles();
                previewFile = undefined;

                const prTypeStr = result.draft ? 'Draft PR' : 'Pull Request';
                const action = await vscode.window.showInformationMessage(
                    `${prTypeStr} #${result.number} created successfully!`,
                    'Open in Browser'
                );

                if (action === 'Open in Browser') {
                    await vscode.env.openExternal(vscode.Uri.parse(result.html_url));
                }
            } else {
                throw new Error('PR creation failed: No PR details received');
            }
        } catch (error) {
            throw error;
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
            const messages = error.response.errors.map((e: { message: string }) => e.message).join(', ');
            vscode.window.showErrorMessage(`Failed to generate PR: ${messages}`);
            return;
        }

        vscode.window.showErrorMessage(`Failed to generate PR: ${error.message}`);
    } finally {
        // プレビューが終了したらファイルをクリーンアップ
        if (previewFile) {
            try {
                await closePreviewTabs();
                await cleanupPreviewFiles();
            } catch (error) {
                console.error('Error cleaning up preview files:', error);
            }
        }
    }
}

// プレビュー表示用の関数
async function showMarkdownPreview(content: string): Promise<{ uri: vscode.Uri, document: vscode.TextDocument } | undefined> {
    try {
        // 一時ディレクトリをクリーンアップして再作成
        await cleanupPreviewFiles();
        const previewDir = await getTempDir();
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(previewDir));

        // ランダムなファイル名で一時ファイルを作成
        const tempUri = vscode.Uri.file(getPreviewFilePath());

        // まず以前のプレビューを閉じる
        await closePreviewTabs();

        // ファイルを書き込む
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(tempUri, encoder.encode(content));

        // ドキュメントを開く（表示はしない）
        const document = await vscode.workspace.openTextDocument(tempUri);

        // プレビューを表示
        await vscode.commands.executeCommand('markdown.showPreview', tempUri);

        return { uri: tempUri, document };
    } catch (error) {
        console.error('Error showing markdown preview:', error);
        return undefined;
    }
}

// プレビュータブを閉じる
async function closePreviewTabs() {
    const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
    const closeTasks = tabs
        .filter(tab => 
            (tab.label.includes('Preview') || tab.label.includes('プレビュー')) &&
            tab.input instanceof vscode.TabInputWebview
        )
        .map(tab => vscode.window.tabGroups.close(tab));
    await Promise.all(closeTasks);
}

// プレビューファイルをクリーンアップ
async function cleanupPreviewFiles() {
    const previewDir = await getTempDir();
    try {
        const stats = await vscode.workspace.fs.stat(vscode.Uri.file(previewDir));
        if (stats) {
            await vscode.workspace.fs.delete(vscode.Uri.file(previewDir), { recursive: true });
        }
    } catch (error) {
        // ディレクトリが存在しない場合は無視
        if (error instanceof vscode.FileSystemError && error.code !== 'FileNotFound') {
            console.error('Error cleaning up preview directory:', error);
        }
    }
}

// 一時ディレクトリのパスを取得
function getTempDir(): string {
    return vscode.Uri.joinPath(vscode.Uri.file(require('os').tmpdir()), 'otak-committer').fsPath;
}

// プレビューファイルのパスを生成
function getPreviewFilePath(): string {
    const timestamp = Date.now();
    const random = require('crypto').randomBytes(4).toString('hex');
    return vscode.Uri.joinPath(
        vscode.Uri.file(getTempDir()),
        `pr-preview-${timestamp}-${random}.md`
    ).fsPath;
}