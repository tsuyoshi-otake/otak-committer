/**
 * File classification constants and utilities for diff prioritization
 *
 * Used by the hybrid large-diff processing system to classify files
 * into priority tiers for smart diff truncation.
 */

import * as path from 'path';

/**
 * Priority levels for file classification in diff processing
 */
export enum FilePriority {
    /** Lock files — never include diff content, summary only */
    EXCLUDE = 0,
    /** Auto-generated or low-value files — included after HIGH priority */
    LOW = 1,
    /** Source code and important files — included first */
    HIGH = 2,
}

/**
 * Lock file names that should be excluded from diff content.
 * These files generate large diffs with minimal semantic value for commit messages.
 */
export const LOCK_FILE_NAMES: readonly string[] = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'pnpm-lock.json',
    'Gemfile.lock',
    'Cargo.lock',
    'poetry.lock',
    'composer.lock',
    'go.sum',
    'Pipfile.lock',
    'bun.lockb',
    'shrinkwrap.yaml',
    'packages.lock.json',
    'flake.lock',
];

/**
 * Patterns matching low-priority files (auto-generated, build output, etc.)
 */
export const LOW_PRIORITY_PATTERNS: readonly RegExp[] = [
    /\.min\.(js|css)$/,
    /\.d\.ts$/,
    /\.snap$/,
    /\.map$/,
    /\.generated\./,
    /[\\/]dist[\\/]/,
    /[\\/]build[\\/]/,
    /[\\/]out[\\/]/,
    /[\\/]coverage[\\/]/,
    /[\\/]__snapshots__[\\/]/,
];

/**
 * Check if a file path is a lock file
 *
 * @param filePath - The file path to check
 * @returns true if the file is a lock file
 */
export function isLockFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    return LOCK_FILE_NAMES.includes(fileName);
}

/**
 * Check if a file path matches low-priority patterns
 *
 * @param filePath - The file path to check
 * @returns true if the file is low-priority
 */
export function isLowPriorityFile(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return LOW_PRIORITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Classify a file's priority based on its path
 *
 * @param filePath - The file path to classify
 * @returns The file's priority level
 */
export function classifyFilePriority(filePath: string): FilePriority {
    if (isLockFile(filePath)) {
        return FilePriority.EXCLUDE;
    }
    if (isLowPriorityFile(filePath)) {
        return FilePriority.LOW;
    }
    return FilePriority.HIGH;
}
