/**
 * TokenManager - GPT-5.2 Token Management Utility
 *
 * Provides utilities for token estimation, input truncation, and validation
 * for the GPT-5.2 Responses API with unified 200K token limits.
 */

import {
    MAX_INPUT_TOKENS as _MAX_INPUT_TOKENS,
    CHARS_PER_TOKEN as _CHARS_PER_TOKEN,
} from '../constants/tokenLimits';

/**
 * Output token allocations for different content types
 */
export interface OutputTokenAllocations {
    readonly COMMIT_MESSAGE: number;
    readonly PR_TITLE: number;
    readonly PR_BODY: number;
    readonly ISSUE: number;
}

/**
 * Token management utility class for GPT-5.2 Responses API
 *
 * Provides methods for:
 * - Estimating token counts from text
 * - Truncating input to fit within token limits
 * - Validating token allocation for API requests
 */
export class TokenManager {
    /** Maximum input tokens (200K unified limit) */
    public static readonly MAX_INPUT_TOKENS = _MAX_INPUT_TOKENS;

    /** Characters per token estimation ratio */
    public static readonly CHARS_PER_TOKEN = _CHARS_PER_TOKEN;

    /** GPT-5.2 context window limit (400K) */
    public static readonly CONTEXT_LIMIT = 400 * 1000;

    /** Buffer reserved for reasoning tokens */
    public static readonly REASONING_BUFFER = 10 * 1000;

    /** Token threshold for Tier 2 smart prioritization */
    public static readonly TIER2_THRESHOLD = 200 * 1000;

    /** Chunk size for Tier 3 map-reduce summarization */
    public static readonly MAP_REDUCE_CHUNK_SIZE = 80 * 1000;

    /** Max output tokens for summarization sub-calls */
    public static readonly SUMMARIZATION_OUTPUT_TOKENS = 2000;

    /** Safety margin for token budget calculations (accounts for estimation imprecision) */
    public static readonly SAFETY_MARGIN = 0.95;

    /** Output token allocations by content type */
    public static readonly OUTPUT_TOKENS: OutputTokenAllocations = {
        COMMIT_MESSAGE: 4000, // Increased for Japanese/CJK languages
        PR_TITLE: 500, // Increased for Japanese/CJK titles
        PR_BODY: 8000, // Increased for detailed PR bodies
        ISSUE: 12000, // Increased for comprehensive issues
    };

    /**
     * Estimate token count from text using 4 characters per token ratio
     *
     * @param text - The text to estimate tokens for
     * @returns Estimated token count
     *
     * @example
     * ```typescript
     * const tokens = TokenManager.estimateTokens('Hello, world!');
     * // Returns 4 (13 characters / 4 = 3.25, rounded up to 4)
     * ```
     */
    public static estimateTokens(text: string): number {
        if (!text || text.length === 0) {
            return 0;
        }
        return Math.ceil(text.length / this.CHARS_PER_TOKEN);
    }

    /**
     * Truncate input to fit within token limit
     *
     * @param input - The input text to truncate
     * @param maxTokens - Maximum allowed tokens
     * @returns Truncated input or original if within limit
     *
     * @example
     * ```typescript
     * const truncated = TokenManager.truncateInput(longText, 200000);
     * ```
     */
    public static truncateInput(input: string, maxTokens: number): string {
        const estimatedTokens = this.estimateTokens(input);

        if (estimatedTokens <= maxTokens) {
            return input;
        }

        const maxChars = maxTokens * this.CHARS_PER_TOKEN;
        return input.substring(0, maxChars);
    }

    /**
     * Validate that token allocation is within GPT-5.2 context limits
     *
     * Ensures that input + output + reasoning buffer does not exceed 400K tokens
     *
     * @param inputTokens - Number of input tokens
     * @param outputTokens - Number of output tokens
     * @returns True if allocation is valid, false otherwise
     *
     * @example
     * ```typescript
     * const isValid = TokenManager.validateAllocation(180000, 8000);
     * // Returns true (180K + 8K + 10K buffer = 198K < 400K)
     * ```
     */
    public static validateAllocation(inputTokens: number, outputTokens: number): boolean {
        const total = inputTokens + outputTokens + this.REASONING_BUFFER;
        return total <= this.CONTEXT_LIMIT;
    }

    /**
     * Get maximum safe input tokens for a given output allocation
     *
     * @param outputTokens - Desired output tokens
     * @returns Maximum safe input tokens
     */
    public static getMaxInputTokens(outputTokens: number): number {
        return Math.min(
            this.MAX_INPUT_TOKENS,
            this.CONTEXT_LIMIT - outputTokens - this.REASONING_BUFFER,
        );
    }

    /**
     * Get the configured max tokens from user settings, falling back to MAX_INPUT_TOKENS
     *
     * @returns The configured max token limit
     */
    public static getConfiguredMaxTokens(): number {
        try {
            const vscode = require('vscode');
            const configuredMaxTokens: unknown = vscode.workspace
                .getConfiguration('otakCommitter')
                .get('maxInputTokens');
            if (typeof configuredMaxTokens === 'number' && configuredMaxTokens >= 1000) {
                return configuredMaxTokens;
            }
        } catch {
            // Not running in VS Code context (e.g., unit tests)
        }
        return this.MAX_INPUT_TOKENS;
    }
}
