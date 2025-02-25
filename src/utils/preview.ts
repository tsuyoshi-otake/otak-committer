import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

const PREVIEW_DIR = path.join(os.tmpdir(), 'otak-committer');

export async function cleanupPreviewFiles() {
    try {
        const stats = await vscode.workspace.fs.stat(vscode.Uri.file(PREVIEW_DIR));
        if (stats) {
            await vscode.workspace.fs.delete(vscode.Uri.file(PREVIEW_DIR), { recursive: true });
        }
    } catch (error) {
        if (error instanceof vscode.FileSystemError && error.code !== 'FileNotFound') {
            console.error('Error cleaning up preview directory:', error);
        }
    }
}

function generateRandomFileName(prefix: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}-preview-${timestamp}-${random}.md`;
}

export async function closePreviewTabs() {
    const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
    const closeTasks = tabs
        .filter(tab => 
            (tab.label.includes('Preview') || tab.label.includes('プレビュー')) &&
            tab.input instanceof vscode.TabInputWebview
        )
        .map(tab => vscode.window.tabGroups.close(tab));
    await Promise.all(closeTasks);
}

export async function showMarkdownPreview(content: string, prefix: string = 'temp'): Promise<{ uri: vscode.Uri, document: vscode.TextDocument } | undefined> {
    try {
        await cleanupPreviewFiles();
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(PREVIEW_DIR));

        const tempUri = vscode.Uri.file(path.join(PREVIEW_DIR, generateRandomFileName(prefix)));
        await closePreviewTabs();

        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(tempUri, encoder.encode(content));

        const document = await vscode.workspace.openTextDocument(tempUri);
        await vscode.commands.executeCommand('markdown.showPreview', tempUri);

        return { uri: tempUri, document };
    } catch (error) {
        console.error('Error showing markdown preview:', error);
        return undefined;
    }
}