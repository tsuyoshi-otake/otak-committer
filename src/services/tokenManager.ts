/**
 * TokenManager - OpenAI Token Management Utility
 *
 * Provides utilities for token estimation, input truncation, and validation
 * for OpenAI generation requests with unified 200K input limits.
 */

import {
    MAX_INPUT_TOKENS as _MAX_INPUT_TOKENS,
    CHARS_PER_TOKEN as _CHARS_PER_TOKEN,
    MIN_CONFIGURED_INPUT_TOKENS,
    MODEL_CONTEXT_WINDOW_TOKENS,
    MODEL_MAX_INPUT_TOKENS,
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
 * Token management utility class for OpenAI generation requests
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

    /** Effective context budget enforced by the extension (gpt-6-luna context window) */
    public static readonly CONTEXT_LIMIT = MODEL_CONTEXT_WINDOW_TOKENS;

    /** Largest input budget a user setting may select (gpt-6-luna max input) */
    public static readonly MODEL_MAX_INPUT_TOKENS = MODEL_MAX_INPUT_TOKENS;

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
        COMMIT_MESSAGE: 5000, // Increased for Japanese/CJK languages
        PR_TITLE: 500, // Increased for Japanese/CJK titles
        PR_BODY: 8000, // Increased for detailed PR bodies
        ISSUE: 12000, // Increased for comprehensive issues
    };

    /**
     * `max_completion_tokens` for the structured PR title + body request. Reasoning
     * tokens count against this limit, so the reasoning buffer is added on top.
     */
    public static readonly PR_CONTENT_COMPLETION_TOKENS =
        TokenManager.OUTPUT_TOKENS.PR_TITLE +
        TokenManager.OUTPUT_TOKENS.PR_BODY +
        TokenManager.REASONING_BUFFER;

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
     * Validate that token allocation is within the extension context budget
     *
     * Ensures that input + output + reasoning buffer does not exceed CONTEXT_LIMIT
     *
     * @param inputTokens - Number of input tokens
     * @param outputTokens - Number of output tokens
     * @returns True if allocation is valid, false otherwise
     *
     * @example
     * ```typescript
     * const isValid = TokenManager.validateAllocation(180000, 8000);
     * // Returns true (180K + 8K + 10K buffer = 198K < 1,050K)
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
     * Resolve a raw `otakCommitter.maxInputTokens` value to the input budget in use.
     *
     * Non-numeric values and values below the minimum fall back to MAX_INPUT_TOKENS.
     * Values above the model's maximum input are clamped, because settings.json
     * edits are not bounded by the manifest schema.
     *
     * @param configuredMaxTokens - Raw setting value
     * @returns The input token budget
     */
    public static resolveConfiguredMaxTokens(configuredMaxTokens: unknown): number {
        if (
            typeof configuredMaxTokens !== 'number' ||
            !Number.isFinite(configuredMaxTokens) ||
            configuredMaxTokens < MIN_CONFIGURED_INPUT_TOKENS
        ) {
            return this.MAX_INPUT_TOKENS;
        }
        return Math.min(Math.floor(configuredMaxTokens), this.MODEL_MAX_INPUT_TOKENS);
    }

    /**
     * Get the configured max tokens from user settings, falling back to MAX_INPUT_TOKENS
     *
     * @returns The configured max token limit
     */
    public static getConfiguredMaxTokens(): number {
        try {
            const vscode = require('vscode');
            return this.resolveConfiguredMaxTokens(
                vscode.workspace.getConfiguration('otakCommitter').get('maxInputTokens'),
            );
        } catch {
            // Not running in VS Code context (e.g., unit tests)
        }
        return this.MAX_INPUT_TOKENS;
    }
}
