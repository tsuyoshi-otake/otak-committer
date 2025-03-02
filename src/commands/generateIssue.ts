import * as vscode from 'vscode';
import { IssueGeneratorServiceFactory } from '../services/issueGenerator';
import { selectFiles as externalSelectFiles } from '../utils/fileSelector';

export async function generateIssue() {
    // Check GitHub authentication immediately upon button press
    const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: true });
    if (!session) {
        vscode.window.showErrorMessage("GitHub authentication is required. Please sign in.");
        return;
    }
    
    let previewFile: { uri: vscode.Uri, document: vscode.TextDocument } | undefined;

    try {
        const service = await IssueGeneratorServiceFactory.initialize();
        if (!service) {
            return;
        }

        const issueType = await vscode.window.showQuickPick(
            service.getAvailableTypes(),
            {
                placeHolder: 'Select issue type'
            }
        );

        if (!issueType) {
            return;
        }

        // Get repository files
        const files = await service.getTrackedFiles();

        // Let user select files for analysis
        const selectedFiles = await selectFiles(files);
        if (selectedFiles.length === 0) {
            const confirm = await vscode.window.showInformationMessage(
                'No files selected. Generate issue with repository structure only?',
                'Yes', 'No'
            );
            if (confirm !== 'Yes') {
                return;
            }
        }

        const description = await vscode.window.showInputBox({
            placeHolder: 'Enter issue description',
            prompt: 'Describe the issue, problem, or task'
        });

        if (!description) {
            return;
        }

        // Show progress notification
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating issue...",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: "Analyzing repository..." });

                // Generate initial preview
                let preview = await service.generatePreview({
                    type: issueType,
                    description,
                    files: selectedFiles
                });

                // Loop for preview and modifications
                let isContentFinalized = false;
                while (!isContentFinalized) {
                    // Show preview in markdown
                    const previewContent = `# Preview of ${issueType.label}\n\nTitle: ${preview.title}\n\n${preview.body}`;
                    previewFile = await showMarkdownPreview(previewContent);
                    if (!previewFile) {
                        throw new Error('Failed to show preview');
                    }

                    // Quick pick menu for actions
                    const action = await vscode.window.showQuickPick([
                        {
                            label: '$(edit) Modify Content',
                            description: 'Provide feedback to improve the content',
                            action: 'modify'
                        },
                        {
                            label: '$(check) Create Issue',
                            description: 'Create issue with current content',
                            action: 'create'
                        },
                        {
                            label: '$(close) Cancel',
                            description: 'Cancel issue creation',
                            action: 'cancel'
                        }
                    ], {
                        placeHolder: 'Choose an action (↑↓ to navigate, Enter to select)',
                        matchOnDescription: true,
                        ignoreFocusOut: true
                    });

                    if (!action || action.action === 'cancel') {
                        return;
                    }

                    if (action.action === 'create') {
                        isContentFinalized = true;
                    } else {
                        progress.report({ message: "Waiting for modification input..." });

                        // Get modification instructions
                        const modifications = await vscode.window.showInputBox({
                            placeHolder: 'Enter modification instructions (press Escape to skip)',
                            prompt: 'Describe how the content should be modified'
                        });

                        // Escapeキーが押された場合は現在のコンテンツで確定
                        if (modifications === undefined) {
                            isContentFinalized = true;
                            continue;
                        }

                        // 空文字列の場合は何も変更せず継続
                        if (!modifications.trim()) {
                            continue;
                        }

                        progress.report({ message: "Updating content..." });

                        // Generate new preview with modifications
                        preview = await service.generatePreview({
                            type: issueType,
                            description: `${description}\n\nModification instructions: ${modifications}`,
                            files: selectedFiles
                        });
                        continue;
                    }

                    // Create action選択時のみここに到達
                    progress.report({ message: "Creating issue..." });

                    // Create issue
                    const issueUrl = await service.createIssue(preview, issueType);

                    if (issueUrl) {
                        // Close preview and show success message
                        await closePreviewTabs();
                        await cleanupPreviewFiles();
                        previewFile = undefined;

                        const response = await vscode.window.showInformationMessage(
                            'Issue created successfully',
                            'Open Issue'
                        );

                        if (response === 'Open Issue') {
                            vscode.env.openExternal(vscode.Uri.parse(issueUrl));
                        }
                    }
                    break;
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to generate issue: ${error.message}`);
            }
        });

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create issue: ${error.message}`);
        console.error(error);
    } finally {
        // Cleanup preview files if they exist
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

// ファイル選択ダイアログ
async function selectFiles(files: string[]): Promise<string[]> {
    // 外部のfileSelectorモジュールを使用
    return externalSelectFiles(files);
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
        `issue-preview-${timestamp}-${random}.md`
    ).fsPath;
}