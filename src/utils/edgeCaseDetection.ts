import { EdgeCaseType, ExtendedDiffMetadata } from './edgeCaseTypes';

/**
 * Detect the type of edge case in a diff
 *
 * @param diff - The diff content
 * @param metadata - Diff metadata including file categories
 * @returns EdgeCaseType or null if not an edge case
 */
export function detectEdgeCase(diff: string, metadata: ExtendedDiffMetadata): EdgeCaseType | null {
    const categories = metadata.categories;

    // Check for binary files
    if (diff.includes('Binary files') && diff.includes(' differ')) {
        return EdgeCaseType.BinaryFiles;
    }

    // Check for whitespace-only changes
    if (isWhitespaceOnlyDiff(diff)) {
        return EdgeCaseType.WhitespaceOnly;
    }

    if (categories) {
        // Count operation types
        const hasAdded = categories.added.length > 0;
        const hasModified = categories.modified.length > 0;
        const hasDeleted = categories.deleted.length > 0;
        const hasRenamed = categories.renamed.length > 0;
        const hasBinary = categories.binary.length > 0;

        const operationCount = [hasAdded, hasModified, hasDeleted, hasRenamed, hasBinary].filter(
            Boolean,
        ).length;

        // Check for deletions-only
        if (hasDeleted && !hasAdded && !hasModified && !hasRenamed && !hasBinary) {
            return EdgeCaseType.DeletionsOnly;
        }

        // Check for renames-only
        if (hasRenamed && !hasAdded && !hasModified && !hasDeleted && !hasBinary) {
            return EdgeCaseType.RenamesOnly;
        }

        // Check for mixed operations
        if (operationCount >= 2) {
            return EdgeCaseType.MixedOperations;
        }
    }

    return null;
}

/**
 * Check if a diff contains only whitespace changes
 *
 * @param diff - The diff content
 * @returns true if the diff is whitespace-only
 */
function isWhitespaceOnlyDiff(diff: string): boolean {
    if (!diff || diff.trim().length === 0) {
        return false;
    }

    // Extract changed lines (lines starting with + or -)
    const lines = diff.split('\n');
    const addedLines: string[] = [];
    const removedLines: string[] = [];

    for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            addedLines.push(line.substring(1));
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            removedLines.push(line.substring(1));
        }
    }

    // If no added/removed lines, not whitespace-only
    if (addedLines.length === 0 && removedLines.length === 0) {
        return false;
    }

    // Compare non-whitespace content
    const addedContent = addedLines.map((l) => l.replace(/\s/g, '')).join('');
    const removedContent = removedLines.map((l) => l.replace(/\s/g, '')).join('');

    // If non-whitespace content is the same, it's whitespace-only changes
    return addedContent === removedContent && addedContent.length > 0;
}
