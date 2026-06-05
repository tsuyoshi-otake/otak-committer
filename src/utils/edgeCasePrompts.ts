import { FileCategories } from './diffUtils';
import { EdgeCasePromptOptions, EdgeCaseType } from './edgeCaseTypes';

/**
 * Create a prompt for edge case scenarios
 *
 * @param edgeCaseType - The type of edge case
 * @param options - Prompt options
 * @returns Prompt string optimized for the edge case
 *
 * **Property 10: Edge case handling**
 */
export function createEdgeCasePrompt(
    edgeCaseType: EdgeCaseType,
    options: EdgeCasePromptOptions,
): string {
    const { language, diff, binaryFiles, deletedFiles, renamedFiles, categories } = options;

    switch (edgeCaseType) {
        case EdgeCaseType.WhitespaceOnly:
            return createWhitespaceOnlyPrompt(diff, language);

        case EdgeCaseType.BinaryFiles:
            return createBinaryFilesPrompt(binaryFiles || [], language);

        case EdgeCaseType.DeletionsOnly:
            return createDeletionsOnlyPrompt(deletedFiles || [], language);

        case EdgeCaseType.RenamesOnly:
            return createRenamesOnlyPrompt(renamedFiles || [], language);

        case EdgeCaseType.MixedOperations:
            return createMixedOperationsPrompt(categories, language);

        default:
            return createDefaultPrompt(diff, language);
    }
}

/**
 * Get a description of an edge case type
 */
export function getEdgeCaseDescription(edgeCaseType: EdgeCaseType): string {
    switch (edgeCaseType) {
        case EdgeCaseType.WhitespaceOnly:
            return 'Changes contain only whitespace/formatting modifications';
        case EdgeCaseType.BinaryFiles:
            return 'Changes include binary files that cannot be diffed';
        case EdgeCaseType.DeletionsOnly:
            return 'Changes consist only of file deletions';
        case EdgeCaseType.RenamesOnly:
            return 'Changes consist only of file renames';
        case EdgeCaseType.MixedOperations:
            return 'Changes include multiple operation types';
        default:
            return 'Standard changes';
    }
}

/**
 * Create prompt for whitespace-only changes
 */
function createWhitespaceOnlyPrompt(diff: string, language: string): string {
    return `Generate a commit message in ${language} for the following changes that are primarily whitespace/formatting changes.

The changes include:
- Indentation adjustments
- Trailing whitespace removal
- Line ending normalization
- Code formatting/style changes

Please focus on describing the formatting improvements in the commit message.

Git diff:
${diff.substring(0, 1000)}

Note: Generate a concise commit message that accurately describes the whitespace/formatting changes.`;
}

/**
 * Create prompt for binary file changes
 */
function createBinaryFilesPrompt(binaryFiles: string[], language: string): string {
    const fileList =
        binaryFiles.length > 0
            ? `Binary files changed:\n${binaryFiles.map((f) => `- ${f}`).join('\n')}`
            : 'Binary files have been modified.';

    return `Generate a commit message in ${language} for the following binary file changes.

${fileList}

Please create a commit message that describes what binary files were changed and, if possible, infer the purpose from the file names.

Note: Since binary files cannot be diffed, focus on the file names and any patterns you can identify.`;
}

/**
 * Create prompt for deletion-only changes
 */
function createDeletionsOnlyPrompt(deletedFiles: string[], language: string): string {
    const fileList =
        deletedFiles.length > 0
            ? `Files deleted:\n${deletedFiles.map((f) => `- ${f}`).join('\n')}`
            : 'Files have been deleted.';

    return `Generate a commit message in ${language} for the following file deletions.

${fileList}

Please create a commit message that:
1. Describes what was removed
2. If possible, explains why (based on file names/patterns)
3. Uses appropriate prefix (e.g., "refactor:", "chore:", "cleanup:")

Note: Focus on describing the removal of these files and their likely purpose.`;
}

/**
 * Create prompt for rename-only changes
 */
function createRenamesOnlyPrompt(
    renamedFiles: Array<{ from: string; to: string }>,
    language: string,
): string {
    const fileList =
        renamedFiles.length > 0
            ? `Files renamed:\n${renamedFiles.map((r) => `- ${r.from} -> ${r.to}`).join('\n')}`
            : 'Files have been renamed.';

    return `Generate a commit message in ${language} for the following file renames.

${fileList}

Please create a commit message that:
1. Describes the renaming pattern
2. Uses appropriate prefix (e.g., "refactor:", "rename:", "chore:")
3. Explains the naming convention improvement if apparent

Note: Focus on describing the renaming changes and any organizational improvements.`;
}

/**
 * Create prompt for mixed operation changes
 */
function createMixedOperationsPrompt(
    categories: FileCategories | undefined,
    language: string,
): string {
    if (!categories) {
        return createDefaultPrompt('mixed changes', language);
    }

    const summary: string[] = [];

    if (categories.added.length > 0) {
        summary.push(
            `Added ${categories.added.length} file(s): ${categories.added.slice(0, 3).join(', ')}${categories.added.length > 3 ? '...' : ''}`,
        );
    }

    if (categories.modified.length > 0) {
        summary.push(
            `Modified ${categories.modified.length} file(s): ${categories.modified.slice(0, 3).join(', ')}${categories.modified.length > 3 ? '...' : ''}`,
        );
    }

    if (categories.deleted.length > 0) {
        summary.push(
            `Deleted ${categories.deleted.length} file(s): ${categories.deleted.slice(0, 3).join(', ')}${categories.deleted.length > 3 ? '...' : ''}`,
        );
    }

    if (categories.renamed.length > 0) {
        summary.push(`Renamed ${categories.renamed.length} file(s)`);
    }

    if (categories.binary.length > 0) {
        summary.push(`Binary ${categories.binary.length} file(s)`);
    }

    return `Generate a commit message in ${language} for the following changes that include multiple types of operations.

Change summary:
${summary.map((s) => `- ${s}`).join('\n')}

Please create a commit message that:
1. Summarizes the overall purpose of the changes
2. Uses an appropriate prefix based on the primary change type
3. Provides context for why these related changes were made together

Note: Focus on the cohesive purpose of these mixed changes.`;
}

/**
 * Create default prompt for normal changes
 */
function createDefaultPrompt(diff: string, language: string): string {
    return `Generate a commit message in ${language} for the following changes.

Git diff:
${diff}

Please create a clear and concise commit message.`;
}
