import { FileCategories, DiffMetadata } from './diffUtils';

/**
 * Types of edge cases in diff content
 */
export enum EdgeCaseType {
    WhitespaceOnly = 'whitespace-only',
    BinaryFiles = 'binary-files',
    DeletionsOnly = 'deletions-only',
    RenamesOnly = 'renames-only',
    MixedOperations = 'mixed-operations',
}

/**
 * Options for creating edge case prompts
 */
export interface EdgeCasePromptOptions {
    /** The diff content */
    diff: string;
    /** Target language for the commit message */
    language: string;
    /** Binary files in the diff */
    binaryFiles?: string[];
    /** Deleted files in the diff */
    deletedFiles?: string[];
    /** Renamed files in the diff */
    renamedFiles?: Array<{ from: string; to: string }>;
    /** File categories */
    categories?: FileCategories;
}

/**
 * Extended metadata for edge case detection
 */
export interface ExtendedDiffMetadata extends Partial<DiffMetadata> {
    fileCount: number;
    isTruncated: boolean;
    hasReservedNames: boolean;
    categories?: FileCategories;
}
