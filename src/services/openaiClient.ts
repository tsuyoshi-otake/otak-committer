import OpenAI from 'openai';
import type { OpenAIConnectionContext } from './openaiConnection';
import { OPENAI_COMPLETION_POLICY } from './openaiRequestPolicy';

/**
 * Create an OpenAI SDK client bound to one normalized connection identity.
 */
export function createOpenAIClient(
    connection: Pick<OpenAIConnectionContext, 'apiKey' | 'baseURL'>,
): OpenAI {
    return new OpenAI({
        apiKey: connection.apiKey,
        baseURL: connection.baseURL,
        timeout: OPENAI_COMPLETION_POLICY.timeout,
        maxRetries: OPENAI_COMPLETION_POLICY.maxRetries,
    });
}
