import { showMarkdownPreview } from '../utils/preview';

export async function showPRPreview(
    prContent: { title: string; body: string },
    issueNumber?: number,
): Promise<{ uri: import('vscode').Uri; document: import('vscode').TextDocument } | undefined> {
    let previewContent = `${prContent.title}\n\n---\n\n${prContent.body}`;
    if (issueNumber) {
        previewContent += `\n\nResolves #${issueNumber}`;
    }
    return showMarkdownPreview(previewContent, 'pr');
}
