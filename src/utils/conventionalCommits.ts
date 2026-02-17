/**
 * Utilities for Conventional Commits format support
 *
 * These are pure functions that don't require VS Code APIs,
 * making them easy to unit test in isolation.
 */

/**
 * Generic directories that should be filtered out when determining scope
 * These are common directory names that don't provide meaningful scope information
 */
const GENERIC_DIRECTORIES = ['src', 'lib', 'app', 'dist', 'build', 'out', 'node_modules'];

/**
 * Extract file paths from a Git diff
 *
 * Parses diff headers to extract the file paths that were modified.
 *
 * @param diff - The Git diff string
 * @returns Array of file paths found in the diff
 *
 * @example
 * ```typescript
 * const paths = extractFilePathsFromDiff(diff);
 * // ['src/services/auth.ts', 'src/components/Button.tsx']
 * ```
 */
export function extractFilePathsFromDiff(diff: string): string[] {
    if (!diff) {
        return [];
    }

    // Match file paths from diff headers: "diff --git a/path/to/file b/path/to/file"
    const filePathRegex = /diff --git a\/(.+?) b\//g;
    const paths: string[] = [];
    let match;

    while ((match = filePathRegex.exec(diff)) !== null) {
        paths.push(match[1]);
    }

    return paths;
}

/**
 * Generate a scope hint from file paths
 *
 * Analyzes the file paths to determine the most appropriate scope for the commit.
 * Filters out generic directories and returns the most common meaningful directory.
 *
 * @param filePaths - Array of file paths from the diff
 * @returns The suggested scope hint, or empty string if no meaningful scope found
 *
 * @example
 * ```typescript
 * const scope = generateScopeHint(['src/services/auth.ts', 'src/services/api.ts']);
 * // 'services'
 * ```
 */
export function generateScopeHint(filePaths: string[]): string {
    if (filePaths.length === 0) {
        return '';
    }

    // Count occurrences of meaningful directories
    const directories = new Map<string, number>();

    for (const filePath of filePaths) {
        const parts = filePath.split('/');

        // Find the first meaningful directory (skip generic ones)
        for (const part of parts) {
            // Skip generic directories and file names (containing dots or being the last part)
            if (
                !GENERIC_DIRECTORIES.includes(part.toLowerCase()) &&
                !part.includes('.') &&
                part !== parts[parts.length - 1]
            ) {
                directories.set(part, (directories.get(part) || 0) + 1);
                break; // Only count the first meaningful directory per file
            }
        }
    }

    // Return the most common directory
    if (directories.size > 0) {
        const sortedDirs = Array.from(directories.entries()).sort((a, b) => b[1] - a[1]);
        return sortedDirs[0][0];
    }

    return '';
}

/**
 * Get format instruction for Conventional Commits format
 *
 * Returns a format instruction string that guides the AI to use
 * the Conventional Commits format with optional scope.
 *
 * @param scopeHint - Optional hint for the scope based on file paths
 * @returns Format instruction string for the AI prompt
 *
 * @example
 * ```typescript
 * const format = getConventionalCommitsFormat('auth');
 * // Returns format instruction with scope guidance
 * ```
 */
export function getConventionalCommitsFormat(scopeHint: string): string {
    const scopeGuidance = scopeHint
        ? `\n\nBased on the changed files, consider using "${scopeHint}" as the scope, or choose a more appropriate scope if the changes suggest otherwise.`
        : '';

    return `<type>(<scope>): <subject>

Where:
- <type> is one of the prefixes listed above
- <scope> is optional but recommended - it should indicate the area of the codebase affected (e.g., auth, ui, api, docs)
- If the scope cannot be determined or changes are too broad, you may omit it and use: <type>: <subject>
- <subject> is a brief description of the change${scopeGuidance}`;
}

/**
 * Get format instruction for traditional commit format
 *
 * Returns a format instruction string for the traditional
 * commit message format with optional scope hint.
 *
 * @param scopeHint - Optional hint for the scope based on file paths
 * @returns Format instruction string for the AI prompt
 *
 * @example
 * ```typescript
 * const format = getTraditionalFormat('services');
 * // '<prefix>: <subject>' with scope hint
 * ```
 */
export function getTraditionalFormat(scopeHint?: string): string {
    if (scopeHint) {
        return `<prefix>(${scopeHint}): <subject>

Where:
- <prefix> is one of the prefixes listed above
- (${scopeHint}) is the scope indicating the affected area
- <subject> is a brief description of the change`;
    }

    return `<prefix>: <subject>

Where:
- <prefix> is one of the prefixes listed above
- <subject> is a brief description of the change`;
}
