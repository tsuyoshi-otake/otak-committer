/**
 * Diff handling utilities for commit message generation robustness
 *
 * **Feature: commit-message-generation-robustness**
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 */

import * as path from 'path';
import { MAX_INPUT_TOKENS, CHARS_PER_TOKEN as TOKEN_RATIO } from '../constants/tokenLimits';
import { FilePriority, classifyFilePriority } from '../constants/diffClassification';

/**
 * File status from git status
 */
export interface StatusFile {
    path: string;
    index: string;
    working_dir: string;
}

/**
 * Categories of file changes
 */
export interface FileCategories {
    added: string[];
    modified: string[];
    deleted: string[];
    renamed: Array<{ from: string; to: string }>;
    binary: string[];
}

/**
 * Metadata about a diff
 */
export interface DiffMetadata {
    fileCount: number;
    isTruncated: boolean;
    originalTokens?: number;
    truncatedTokens?: number;
    hasReservedNames: boolean;
    reservedFiles?: string[];
    categories?: FileCategories;
}

/**
 * Result of diff processing
 */
export interface DiffResult {
    content: string;
    metadata: DiffMetadata;
}

/**
 * Result of truncation operation
 */
export interface TruncationResult {
    content: string;
    isTruncated: boolean;
    originalTokens?: number;
    truncatedTokens?: number;
}

const TRUNCATE_THRESHOLD_TOKENS = MAX_INPUT_TOKENS;
const CHARS_PER_TOKEN = TOKEN_RATIO;
const LINE_BOUNDARY_SEARCH_RANGE = 200;

/**
 * Windows reserved device names
 */
const RESERVED_NAMES = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
];

/**
 * Estimate the number of tokens in a string
 * Uses a simple approximation of 4 characters per token
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Truncate a diff to fit within token limits while preserving file context
 * Ensures that file headers are not cut off mid-way
 *
 * @param diff - The diff content to truncate
 * @returns TruncationResult with content and metadata
 *
 * **Property 1: Truncation preserves file context**
 */
export function truncateDiff(diff: string): TruncationResult {
    const originalTokens = estimateTokenCount(diff);

    if (originalTokens <= TRUNCATE_THRESHOLD_TOKENS) {
        return {
            content: diff,
            isTruncated: false,
        };
    }

    // Calculate target length
    const targetLength = TRUNCATE_THRESHOLD_TOKENS * CHARS_PER_TOKEN;

    // Find a good cut point that doesn't split a file
    let cutPoint = targetLength;

    // Try to find a file header boundary before the cut point
    const fileHeaderPattern = /\ndiff --git /g;
    let lastMatch: RegExpExecArray | null = null;
    let match: RegExpExecArray | null;

    while ((match = fileHeaderPattern.exec(diff)) !== null) {
        if (match.index < targetLength) {
            lastMatch = match;
        } else {
            break;
        }
    }

    // If we found a file boundary, cut there
    if (lastMatch && lastMatch.index > targetLength * 0.5) {
        cutPoint = lastMatch.index;
    }

    // Ensure we don't cut in the middle of a line
    const nextNewline = diff.indexOf('\n', cutPoint);
    if (nextNewline !== -1 && nextNewline < cutPoint + LINE_BOUNDARY_SEARCH_RANGE) {
        cutPoint = nextNewline + 1;
    }

    const truncatedContent = diff.substring(0, cutPoint);
    const truncatedTokens = estimateTokenCount(truncatedContent);

    return {
        content: truncatedContent,
        isTruncated: true,
        originalTokens,
        truncatedTokens,
    };
}

/**
 * Check if a file path contains a Windows reserved name
 *
 * @param filePath - The file path to check
 * @returns true if the path contains a reserved name
 *
 * **Property 3: Reserved name detection accuracy**
 */
export function isWindowsReservedName(filePath: string): boolean {
    // Get the file name part (last segment of path)
    const fileName = path.basename(filePath);

    // Get name without extension
    const nameWithoutExt = fileName.split('.')[0];

    // Check if it matches any reserved name (case-insensitive)
    return RESERVED_NAMES.some((reserved) => nameWithoutExt.toUpperCase() === reserved);
}

/**
 * Categorize files by their operation type
 *
 * @param files - Array of status files from git
 * @returns FileCategories object with files organized by operation
 *
 * **Property 2: File categorization completeness**
 */
export function categorizeFiles(files: StatusFile[]): FileCategories {
    const categories: FileCategories = {
        added: [],
        modified: [],
        deleted: [],
        renamed: [],
        binary: [],
    };

    for (const file of files) {
        const index = file.index;
        const filePath = file.path;

        // Check for rename (R in index or path contains ' -> ')
        if (index === 'R' || filePath.includes(' -> ')) {
            const parts = filePath.split(' -> ');
            if (parts.length === 2) {
                categories.renamed.push({
                    from: parts[0].trim(),
                    to: parts[1].trim(),
                });
            }
            continue;
        }

        // Check for added
        if (index === 'A' || index === '?') {
            categories.added.push(filePath);
            continue;
        }

        // Check for deleted
        if (index === 'D') {
            categories.deleted.push(filePath);
            continue;
        }

        // Check for modified
        if (index === 'M') {
            categories.modified.push(filePath);
            continue;
        }

        // Check working directory changes for untracked/modified
        if (file.working_dir === '?' || file.working_dir === 'A') {
            categories.added.push(filePath);
        } else if (file.working_dir === 'M') {
            categories.modified.push(filePath);
        } else if (file.working_dir === 'D') {
            categories.deleted.push(filePath);
        }
    }

    return categories;
}

/**
 * Generate a summary of file changes by category
 *
 * @param categories - File categories
 * @returns Formatted summary string
 */
export function generateFileSummary(categories: FileCategories): string {
    const sections: string[] = [];

    if (categories.added.length > 0) {
        sections.push(
            `Added (${categories.added.length} files):\n${categories.added.map((f) => `  - ${f}`).join('\n')}`,
        );
    }

    if (categories.modified.length > 0) {
        sections.push(
            `Modified (${categories.modified.length} files):\n${categories.modified.map((f) => `  - ${f}`).join('\n')}`,
        );
    }

    if (categories.deleted.length > 0) {
        sections.push(
            `Deleted (${categories.deleted.length} files):\n${categories.deleted.map((f) => `  - ${f}`).join('\n')}`,
        );
    }

    if (categories.renamed.length > 0) {
        sections.push(
            `Renamed (${categories.renamed.length} files):\n${categories.renamed.map((r) => `  - ${r.from} -> ${r.to}`).join('\n')}`,
        );
    }

    if (categories.binary.length > 0) {
        sections.push(
            `Binary (${categories.binary.length} files):\n${categories.binary.map((f) => `  - ${f}`).join('\n')}`,
        );
    }

    return sections.join('\n\n');
}

/**
 * Detect reserved name files in a list of files
 *
 * @param files - List of file paths
 * @returns Array of file paths that have reserved names
 */
export function detectReservedFiles(files: string[]): string[] {
    return files.filter(isWindowsReservedName);
}

/**
 * Create a DiffResult with full metadata
 *
 * @param content - The diff content
 * @param files - Status files
 * @returns Complete DiffResult
 */
export function createDiffResult(content: string, files: StatusFile[]): DiffResult {
    const categories = categorizeFiles(files);
    const allFiles = [
        ...categories.added,
        ...categories.modified,
        ...categories.deleted,
        ...categories.renamed.map((r) => r.from),
        ...categories.binary,
    ];
    const reservedFiles = detectReservedFiles(allFiles);

    const truncationResult = truncateDiff(content);

    return {
        content: truncationResult.content,
        metadata: {
            fileCount: files.length,
            isTruncated: truncationResult.isTruncated,
            originalTokens: truncationResult.originalTokens,
            truncatedTokens: truncationResult.truncatedTokens,
            hasReservedNames: reservedFiles.length > 0,
            reservedFiles: reservedFiles.length > 0 ? reservedFiles : undefined,
            categories,
        },
    };
}

// Re-export for convenience
export { FilePriority } from '../constants/diffClassification';

/**
 * Parsed representation of a single file's diff
 */
export interface ParsedFileDiff {
    /** File path extracted from the diff header */
    filePath: string;
    /** Full diff content for this file (header + hunks) */
    content: string;
    /** Number of added lines */
    additions: number;
    /** Number of deleted lines */
    deletions: number;
    /** Estimated token count of the content */
    tokenCount: number;
    /** Classified priority */
    priority: FilePriority;
}

/**
 * Result of assembling a prioritized diff
 */
export interface AssembledDiffResult {
    /** The assembled diff content (summary header + prioritized file diffs) */
    content: string;
    /** Number of files included with full diff */
    includedCount: number;
    /** Number of files with summary only (no diff content) */
    summaryOnlyCount: number;
    /** Files that could not fit within the token budget */
    overflowFiles: ParsedFileDiff[];
}

/**
 * Parse a unified diff string into per-file sections
 *
 * Splits on `diff --git a/... b/...` boundaries and classifies each file.
 *
 * @param rawDiff - The raw unified diff string
 * @returns Array of parsed file diffs
 */
export function parseDiffIntoFiles(rawDiff: string): ParsedFileDiff[] {
    if (!rawDiff || rawDiff.trim() === '') {
        return [];
    }

    const headerRegex = /^diff --git a\/(.+?) b\/.+$/gm;
    const positions: { index: number; filePath: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(rawDiff)) !== null) {
        positions.push({ index: match.index, filePath: match[1] });
    }

    if (positions.length === 0) {
        return [];
    }

    return positions.map((pos, i) => {
        const endIndex = i + 1 < positions.length ? positions[i + 1].index : rawDiff.length;
        const content = rawDiff.substring(pos.index, endIndex);

        let additions = 0;
        let deletions = 0;
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                additions++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                deletions++;
            }
        }

        return {
            filePath: pos.filePath,
            content,
            additions,
            deletions,
            tokenCount: estimateTokenCount(content),
            priority: classifyFilePriority(pos.filePath),
        };
    });
}

/**
 * Build a change summary header listing all files with their change stats
 *
 * @param files - Parsed file diffs
 * @returns Formatted summary header string
 */
export function buildChangeSummaryHeader(files: ParsedFileDiff[]): string {
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    const lines: string[] = [
        `## Change Summary (${files.length} files, +${totalAdditions}/-${totalDeletions})`,
        '',
    ];

    for (const file of files) {
        const priorityLabel =
            file.priority === FilePriority.EXCLUDE
                ? ' [LOCK]'
                : file.priority === FilePriority.LOW
                  ? ' [generated]'
                  : '';
        lines.push(`- ${file.filePath} (+${file.additions}/-${file.deletions})${priorityLabel}`);
    }

    lines.push('');
    return lines.join('\n');
}

/**
 * Assemble a prioritized diff that fits within a token budget
 *
 * Includes the summary header followed by full diffs ordered by priority (HIGH → LOW).
 * EXCLUDE-priority files never have their diff content included.
 *
 * @param files - Parsed file diffs
 * @param summaryHeader - Pre-built summary header
 * @param tokenBudget - Maximum tokens for the assembled result
 * @returns Assembled diff result with overflow information
 */
export function assemblePrioritizedDiff(
    files: ParsedFileDiff[],
    summaryHeader: string,
    tokenBudget: number,
): AssembledDiffResult {
    const summaryTokens = estimateTokenCount(summaryHeader);
    let remainingBudget = tokenBudget - summaryTokens;

    const sortedFiles = [...files]
        .filter((f) => f.priority !== FilePriority.EXCLUDE)
        .sort((a, b) => b.priority - a.priority);

    const includedDiffs: string[] = [];
    const overflowFiles: ParsedFileDiff[] = [];
    let includedCount = 0;

    for (const file of sortedFiles) {
        if (file.tokenCount <= remainingBudget) {
            includedDiffs.push(file.content);
            remainingBudget -= file.tokenCount;
            includedCount++;
        } else {
            overflowFiles.push(file);
        }
    }

    const excludedCount = files.filter((f) => f.priority === FilePriority.EXCLUDE).length;
    const summaryOnlyCount = overflowFiles.length + excludedCount;

    const content = summaryHeader + includedDiffs.join('');

    return {
        content,
        includedCount,
        summaryOnlyCount,
        overflowFiles,
    };
}
