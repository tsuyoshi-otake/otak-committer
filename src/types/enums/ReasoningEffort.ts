/**
 * Reasoning effort levels for GPT model API calls
 */
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

/**
 * Effort used when the setting is unset. Must match the `default` of
 * `otakCommitter.reasoningEffort` in package.json.
 */
export const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'high';
