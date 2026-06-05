import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n';
import type { OpenAIService } from '../services/openai';
import { DiffProcessor, DiffTier, type DiffProcessResult } from '../services/diffProcessor';
import { TokenManager } from '../services/tokenManager';

type ProgressRunner = <T>(title: string, task: () => Promise<T>) => Promise<T>;

interface ProcessCommitDiffOptions {
    rawDiff: string;
    openai: OpenAIService;
    language: string;
    signal?: AbortSignal;
    logger: Logger;
    withProgress: ProgressRunner;
}

/**
 * Process diff through the hybrid tier system (Tier 1/2/3).
 */
export async function processCommitDiff({
    rawDiff,
    openai,
    language,
    signal,
    logger,
    withProgress,
}: ProcessCommitDiffOptions): Promise<DiffProcessResult> {
    const tokenBudget = TokenManager.getConfiguredMaxTokens();
    const processor = new DiffProcessor(openai, language, (msg) =>
        logger.info(`Map-reduce progress: ${msg}`),
    );

    const result = await withProgress(t('progress.processingLargeDiff'), async () =>
        processor.process(rawDiff, tokenBudget, signal),
    );

    logDiffProcessingResult(result, rawDiff, logger);
    return result;
}

function logDiffProcessingResult(result: DiffProcessResult, rawDiff: string, logger: Logger): void {
    if (result.tier === DiffTier.SmartPrioritized) {
        const tokenCount = Math.floor(rawDiff.length / 4 / 1000);
        logger.info(
            t('git.smartDiffApplied', {
                tokenCount,
                included: result.includedFiles,
                total: result.totalFiles,
            }),
        );
    } else if (result.tier === DiffTier.MapReduce) {
        const tokenCount = Math.floor(rawDiff.length / 4 / 1000);
        logger.info(
            t('git.mapReduceApplied', {
                tokenCount,
                chunks: result.excludedFiles,
            }),
        );
    }
}
