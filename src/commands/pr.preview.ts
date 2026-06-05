import * as vscode from 'vscode';
import { showMarkdownPreview } from '../utils/preview';

/**
 * Render the generated PR title and body as a Markdown preview document
 *
 * @param prContent - Generated PR title and body
 * @param issueNumber - Optional issue number to include via "Resolves #N"
 * @param storageUri - Optional storage location for the preview file
 * @returns The opened preview file descriptor, or undefined if it could not be shown
 */
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
