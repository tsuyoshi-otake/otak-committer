export interface StatusFile {
    path: string;
    index: string;
    working_dir: string;
}

export interface FileCategories {
    added: string[];
    modified: string[];
    deleted: string[];
    renamed: Array<{ from: string; to: string }>;
    binary: string[];
}

export interface DiffMetadata {
    fileCount: number;
    isTruncated: boolean;
    originalTokens?: number;
    truncatedTokens?: number;
    hasReservedNames: boolean;
    reservedFiles?: string[];
    categories?: FileCategories;
}

export interface DiffResult {
    content: string;
    metadata: DiffMetadata;
}

export interface TruncationResult {
    content: string;
    isTruncated: boolean;
    originalTokens?: number;
    truncatedTokens?: number;
}

export interface ParsedFileDiff {
    filePath: string;
    content: string;
    additions: number;
    deletions: number;
    tokenCount: number;
    priority: FilePriority;
}

export interface AssembledDiffResult {
    content: string;
    includedCount: number;
    summaryOnlyCount: number;
    overflowFiles: ParsedFileDiff[];
}
import { FilePriority } from '../constants/diffClassification';
