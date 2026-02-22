/**
 * DiffProcessor - Hybrid large-diff processing orchestrator
 *
 * Implements a 3-tier approach:
 * - Tier 1 (Normal): Diff fits within token budget, pass through as-is
 * - Tier 2 (Smart Prioritization): Parse by file, exclude lock files, prioritize by importance
 * - Tier 3 (Map-Reduce): Summarize overflow chunks via parallel API calls
 */

import { Logger } from '../infrastructure/logging/Logger';
import { TokenManager } from './tokenManager';
import {
    parseDiffIntoFiles,
    buildChangeSummaryHeader,
    assemblePrioritizedDiff,
    estimateTokenCount,
} from '../utils/diffUtils';
import { MapReduceSummarizer, MapReduceProgressCallback } from './mapReduceSummarizer';

// Use type-only import to avoid circular dependency
import type { OpenAIService } from './openaiService';

/**
 * Processing tier used for the diff
 */
export enum DiffTier {
    /** Diff fits within budget, no processing needed */
    Normal = 1,
    /** Smart prioritization: exclude lock files, prioritize source code */
    SmartPrioritized = 2,
    /** Map-reduce: chunk and summarize overflow files */
    MapReduce = 3,
}

/**
 * Result of diff processing
 */
export interface DiffProcessResult {
    /** The processed diff content to use in the prompt */
    processedDiff: string;
    /** Which processing tier was applied */
    tier: DiffTier;
    /** Total number of files in the original diff */
    totalFiles: number;
    /** Number of files included with full diff content */
    includedFiles: number;
    /** Number of files excluded or summary-only */
    excludedFiles: number;
}

/**
 * Orchestrates diff processing across three tiers
 */
export class DiffProcessor {
    private logger: Logger;

    /**
     * @param openaiService - OpenAI service instance (required for Tier 3)
     * @param language - Target language for summaries
     * @param progressCallback - Optional callback for progress reporting
     */
    constructor(
        private openaiService?: OpenAIService,
        private language: string = 'english',
        private progressCallback?: MapReduceProgressCallback,
    ) {
        this.logger = Logger.getInstance();
    }

    /**
     * Process a raw diff through the appropriate tier
     *
     * @param rawDiff - The untruncated diff string
     * @param tokenBudget - Maximum token budget for the result
     * @returns Processed diff result
     */
    async process(rawDiff: string, tokenBudget: number): Promise<DiffProcessResult> {
        const safeBudget = Math.floor(tokenBudget * TokenManager.SAFETY_MARGIN);
        const rawTokens = estimateTokenCount(rawDiff);

        // Tier 1: fits within budget
        if (rawTokens <= safeBudget) {
            this.logger.info(`Diff processing: Tier 1 (${rawTokens} tokens, budget ${safeBudget})`);
            return {
                processedDiff: rawDiff,
                tier: DiffTier.Normal,
                totalFiles: 0,
                includedFiles: 0,
                excludedFiles: 0,
            };
        }

        // Parse diff into files for Tier 2+
        const files = parseDiffIntoFiles(rawDiff);

        if (files.length === 0) {
            // Could not parse file boundaries; fall back to simple truncation
            this.logger.warning('Could not parse diff into files, falling back to truncation');
            const truncated = rawDiff.substring(0, safeBudget * TokenManager.CHARS_PER_TOKEN);
            return {
                processedDiff: truncated,
                tier: DiffTier.Normal,
                totalFiles: 0,
                includedFiles: 0,
                excludedFiles: 0,
            };
        }

        // Tier 2: Smart prioritization
        const summaryHeader = buildChangeSummaryHeader(files);
        const assembled = assemblePrioritizedDiff(files, summaryHeader, safeBudget);

        this.logger.info(
            `Diff processing: Tier 2 applied (${files.length} files, ${assembled.includedCount} included, ${assembled.summaryOnlyCount} summary-only)`,
        );

        // Check if Tier 3 is needed (overflow files exist and we have an OpenAI service)
        if (assembled.overflowFiles.length > 0 && this.openaiService) {
            this.logger.info(
                `Diff processing: Tier 3 triggered (${assembled.overflowFiles.length} overflow files)`,
            );

            const summarizer = new MapReduceSummarizer(
                this.openaiService,
                this.progressCallback,
            );

            const mapReduceResult = await summarizer.summarize(
                assembled.overflowFiles,
                this.language,
            );

            // Combine Tier 2 content with Tier 3 summaries
            const combinedContent =
                assembled.content +
                '\n\n## Summarized Changes (files not included in full diff)\n\n' +
                mapReduceResult.summary;

            return {
                processedDiff: combinedContent,
                tier: DiffTier.MapReduce,
                totalFiles: files.length,
                includedFiles: assembled.includedCount,
                excludedFiles: assembled.summaryOnlyCount,
            };
        }

        return {
            processedDiff: assembled.content,
            tier: DiffTier.SmartPrioritized,
            totalFiles: files.length,
            includedFiles: assembled.includedCount,
            excludedFiles: assembled.summaryOnlyCount,
        };
    }
}
