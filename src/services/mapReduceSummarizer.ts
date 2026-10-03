/**
 * Map-Reduce summarizer for Tier 3 large-diff processing
 *
 * When diffs exceed the token budget even after smart prioritization (Tier 2),
 * this service splits overflow files into chunks, summarizes each chunk via
 * OpenAI API calls (in parallel), and combines the summaries.
 */

import { Logger } from '../infrastructure/logging/Logger';
import { TokenManager } from './tokenManager';
import { ParsedFileDiff, estimateTokenCount } from '../utils/diffUtils';
import { groupIntoChunks } from '../utils/diffChunking';
import { detectPotentialSecrets } from '../utils/secretDetection';
import { isUserAbortError } from '../utils/errorGuards';

// Use a type-only import to avoid circular dependency at runtime
import type { OpenAIService } from './openaiService';

/**
 * Progress callback for reporting map-reduce progress
 */
export type MapReduceProgressCallback = (message: string) => void;

/**
 * Result of map-reduce summarization
 */
export interface MapReduceResult {
    /** Combined summary of all chunks */
    summary: string;
    /** Number of chunks processed */
    chunksProcessed: number;
    /** Number of chunks that failed summarization */
    chunksFailed: number;
}

/**
 * Map-Reduce summarizer for processing very large diffs
 */
export class MapReduceSummarizer {
    private static readonly MAX_PARALLEL_CALLS = 3;
    private logger: Logger;

    constructor(
        private openaiService: OpenAIService,
        private progressCallback?: MapReduceProgressCallback,
    ) {
        this.logger = Logger.getInstance();
    }

    /**
     * Summarize overflow files using map-reduce pattern
     *
     * @param overflowFiles - Files that didn't fit in the Tier 2 budget
     * @param language - Target language for summaries
     * @returns Combined summary result
     */
    async summarize(
        overflowFiles: ParsedFileDiff[],
        language: string,
        signal?: AbortSignal,
    ): Promise<MapReduceResult> {
        const chunkSize = TokenManager.MAP_REDUCE_CHUNK_SIZE;
        const chunks = groupIntoChunks(overflowFiles, chunkSize);

        this.logger.info(
            `Map-reduce: processing ${chunks.length} chunks from ${overflowFiles.length} files`,
        );

        const summaries: string[] = [];
        let chunksFailed = 0;

        // Process chunks in batches of MAX_PARALLEL_CALLS
        for (let i = 0; i < chunks.length; i += MapReduceSummarizer.MAX_PARALLEL_CALLS) {
            const batch = chunks.slice(i, i + MapReduceSummarizer.MAX_PARALLEL_CALLS);
            const batchPromises = batch.map((chunk, batchIndex) => {
                const chunkIndex = i + batchIndex;
                this.progressCallback?.(`${chunkIndex + 1}/${chunks.length}`);
                return this.summarizeChunk(chunk, language, chunkIndex, signal);
            });

            const batchResults = await Promise.all(batchPromises);

            for (let j = 0; j < batchResults.length; j++) {
                const result = batchResults[j];
                if (result) {
                    summaries.push(result);
                } else {
                    chunksFailed++;
                    // Fallback: include file list only
                    const chunk = batch[j];
                    const fileList = chunk.map((f) => f.filePath).join(', ');
                    summaries.push(`[Summarization failed for: ${fileList}]`);
                }
            }
        }

        return {
            summary: summaries.join('\n\n'),
            chunksProcessed: chunks.length,
            chunksFailed,
        };
    }

    /**
     * Summarize a single chunk of files
     */
    private async summarizeChunk(
        chunk: ParsedFileDiff[],
        language: string,
        chunkIndex: number,
        signal?: AbortSignal,
    ): Promise<string | undefined> {
        const chunkContent = chunk.map((f) => f.content).join('\n');
        this.logger.debug(
            `Summarizing chunk ${chunkIndex} (${estimateTokenCount(chunkContent)} tokens, ${chunk.length} files)`,
        );

        // Warn if potential secrets are detected (non-blocking)
        const detection = detectPotentialSecrets(chunkContent);
        if (detection.hasPotentialSecrets) {
            const fileList = chunk.map((f) => f.filePath).join(', ');
            this.logger.warning(
                `Potential secrets detected in chunk ${chunkIndex}, proceeding with summarization`,
                { matchedPatternIds: detection.matchedPatternIds, files: fileList },
            );
        }

        try {
            return await this.openaiService.summarizeChunk(chunkContent, language, signal);
        } catch (error) {
            if (signal?.aborted || isUserAbortError(error)) {
                throw error;
            }
            this.logger.error(`Failed to summarize chunk ${chunkIndex}`, error);
            return undefined;
        }
    }
}
