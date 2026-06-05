import * as vscode from 'vscode';
import { showMarkdownPreview } from '../utils/preview';

export async function showPRPreview(
    prContent: { title: string; body: string },
    issueNumber?: number,
    storageUri?: vscode.Uri,
): Promise<{ uri: vscode.Uri; document: vscode.TextDocument } | undefined> {
    let previewContent = `${prContent.title}\n\n---\n\n${prContent.body}`;
    if (issueNumber) {
        previewContent += `\n\nResolves #${issueNumber}`;
    }
    return showMarkdownPreview(previewContent, 'pr', storageUri);
}
