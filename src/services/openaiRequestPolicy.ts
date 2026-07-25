/**
 * Bounded timeout and retry policy passed to an OpenAI SDK request.
 */
export interface OpenAIRequestPolicy {
    timeout: number;
    maxRetries: number;
}

/**
 * Validation is an interactive preflight. It must finish promptly and leaves
 * retry ownership with the user-facing initialization state machine.
 */
export const OPENAI_VALIDATION_POLICY: Readonly<OpenAIRequestPolicy> = {
    timeout: 30_000,
    maxRetries: 0,
};

/**
 * Completion requests retain the established two-minute timeout and the SDK's
 * bounded retry behavior.
 */
export const OPENAI_COMPLETION_POLICY: Readonly<OpenAIRequestPolicy> = {
    timeout: 120_000,
    maxRetries: 2,
};
