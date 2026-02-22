import { FilePriority } from '../constants/diffClassification';
import {
    categorizeFiles,
    detectReservedFiles,
    generateFileSummary,
    isWindowsReservedName,
} from './diff.categorize';
import {
    assemblePrioritizedDiff,
    buildChangeSummaryHeader,
    parseDiffIntoFiles,
} from './diff.assemble';
import { estimateTokenCount, truncateDiff } from './diff.truncate';
import {
    AssembledDiffResult,
    DiffMetadata,
    DiffResult,
    FileCategories,
    ParsedFileDiff,
    StatusFile,
    TruncationResult,
} from './diff.types';

export type {
    StatusFile,
    FileCategories,
    DiffMetadata,
    DiffResult,
    TruncationResult,
    ParsedFileDiff,
    AssembledDiffResult,
};

export {
    estimateTokenCount,
    truncateDiff,
    isWindowsReservedName,
    categorizeFiles,
    generateFileSummary,
    detectReservedFiles,
    parseDiffIntoFiles,
    buildChangeSummaryHeader,
    assemblePrioritizedDiff,
    FilePriority,
};

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
