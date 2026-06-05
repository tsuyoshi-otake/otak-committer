import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

const PREVIEW_DIR_NAME = 'preview';
const FALLBACK_PREVIEW_DIR = path.join(os.tmpdir(), 'otak-committer');

function getPreviewDirectoryUri(storageUri?: vscode.Uri): vscode.Uri {
    if (storageUri) {
        return vscode.Uri.joinPath(storageUri, PREVIEW_DIR_NAME);
    }
    return vscode.Uri.file(FALLBACK_PREVIEW_DIR);
}

export async function cleanupPreviewFiles(storageUri?: vscode.Uri) {
    try {
        await vscode.workspace.fs.delete(getPreviewDirectoryUri(storageUri), { recursive: true });
    } catch {
        // Ignore errors - directory may not exist
    }
}

function generateRandomFileName(prefix: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `${prefix}-preview-${timestamp}-${random}.md`;
}

export async function closePreviewTabs() {
    const tabs = vscode.window.tabGroups.all.flatMap((group) => group.tabs);
    const closeTasks = tabs
        .filter(
            (tab) =>
                (tab.label.includes('Preview') || tab.label.includes('プレビュー')) &&
                tab.input instanceof vscode.TabInputWebview,
        )
        .map((tab) => vscode.window.tabGroups.close(tab));
    await Promise.all(closeTasks);
}

export async function showMarkdownPreview(
    content: string,
    prefix: string = 'temp',
    storageUri?: vscode.Uri,
): Promise<{ uri: vscode.Uri; document: vscode.TextDocument } | undefined> {
    try {
        const previewDir = getPreviewDirectoryUri(storageUri);
        await cleanupPreviewFiles(storageUri);
        await vscode.workspace.fs.createDirectory(previewDir);

        const tempUri = vscode.Uri.joinPath(previewDir, generateRandomFileName(prefix));
        await closePreviewTabs();

        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(tempUri, encoder.encode(content));

        const document = await vscode.workspace.openTextDocument(tempUri);
        await vscode.commands.executeCommand('markdown.showPreview', tempUri);

        return { uri: tempUri, document };
    } catch {
        return undefined;
    }
}
