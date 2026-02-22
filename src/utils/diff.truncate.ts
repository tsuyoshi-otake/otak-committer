import { MAX_INPUT_TOKENS, CHARS_PER_TOKEN as TOKEN_RATIO } from '../constants/tokenLimits';
import { TruncationResult } from './diff.types';

const TRUNCATE_THRESHOLD_TOKENS = MAX_INPUT_TOKENS;
const CHARS_PER_TOKEN = TOKEN_RATIO;
const LINE_BOUNDARY_SEARCH_RANGE = 200;

export function estimateTokenCount(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function truncateDiff(diff: string): TruncationResult {
    const originalTokens = estimateTokenCount(diff);

    if (originalTokens <= TRUNCATE_THRESHOLD_TOKENS) {
        return {
            content: diff,
            isTruncated: false,
        };
    }

    const targetLength = TRUNCATE_THRESHOLD_TOKENS * CHARS_PER_TOKEN;
    let cutPoint = targetLength;

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

    if (lastMatch && lastMatch.index > targetLength * 0.5) {
        cutPoint = lastMatch.index;
    }

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
