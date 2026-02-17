/**
 * Diff handling utilities for commit message generation robustness
 *
 * **Feature: commit-message-generation-robustness**
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 */

import * as path from 'path';
import { MAX_INPUT_TOKENS, CHARS_PER_TOKEN as TOKEN_RATIO } from '../constants/tokenLimits';

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
