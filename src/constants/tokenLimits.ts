/**
 * Token-related constants shared across layers
 */

/** Maximum input tokens (200K unified limit) */
export const MAX_INPUT_TOKENS = 200 * 1000;

/** Characters per token estimation ratio */
export const CHARS_PER_TOKEN = 4;

/** Context window of gpt-6-luna, the model used for every operation */
export const MODEL_CONTEXT_WINDOW_TOKENS = 1050 * 1000;

/** Largest input gpt-6-luna accepts; upper bound for `otakCommitter.maxInputTokens` */
export const MODEL_MAX_INPUT_TOKENS = 922 * 1000;

/** Smallest accepted `otakCommitter.maxInputTokens` value */
export const MIN_CONFIGURED_INPUT_TOKENS = 1000;
