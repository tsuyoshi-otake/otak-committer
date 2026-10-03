/**
 * Naming of this extension's temporary Markdown preview files.
 *
 * The generator and the recognizer share one format, so preview cleanup closes
 * only tabs that show files this extension wrote.
 */

/** `<prefix>-preview-<epoch ms>-<8 hex>.md`, not followed by more file-name characters */
const PREVIEW_FILE_NAME = /[A-Za-z0-9_]-preview-\d{13,}-[0-9a-f]{8}\.md(?![A-Za-z0-9_.-])/;

/**
 * Build a unique preview file name.
 *
 * @param prefix - Preview kind such as `pr` or `issue`
 * @param timestamp - Epoch milliseconds
 * @param randomHex - 8 lowercase hex characters
 * @returns The file name, e.g. `pr-preview-1759449600000-1a2b3c4d.md`
 */
export function buildPreviewFileName(prefix: string, timestamp: number, randomHex: string): string {
    return `${prefix}-preview-${timestamp}-${randomHex}.md`;
}

/**
 * Check whether a tab label names one of this extension's preview files.
 *
 * Markdown preview tabs are labelled with the file name after a localized word
 * (e.g. "Preview pr-preview-….md"), so the file name is matched, not the word.
 *
 * @param label - Tab label
 * @returns True when the label refers to a file built by {@link buildPreviewFileName}
 */
export function isExtensionPreviewLabel(label: string): boolean {
    return PREVIEW_FILE_NAME.test(label);
}
