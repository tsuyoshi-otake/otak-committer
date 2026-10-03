import OpenAI from 'openai';
import type { ChatCompletionReasoningEffort } from 'openai/resources/chat/completions';
import type { ReasoningEffort } from '../types/enums/ReasoningEffort';
import { OPENAI_COMPLETION_POLICY } from './openaiRequestPolicy';

/**
 * Parameters for a plain-text OpenAI chat completion request
 */
export interface TextCompletionRequest {
    openai: OpenAI;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxCompletionTokens: number;
    reasoningEffort: ReasoningEffort | undefined;
    signal?: AbortSignal;
}

/**
 * Parameters for a JSON-schema-constrained OpenAI chat completion request
 */
export interface StructuredCompletionRequest {
    openai: OpenAI;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    reasoningEffort: ReasoningEffort | undefined;
    signal?: AbortSignal;
    schemaName: string;
    schema: Record<string, unknown>;
}

interface CompletionRequestBase {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    reasoningEffort: ReasoningEffort | undefined;
    signal?: AbortSignal;
}

function createCompletionParams(request: CompletionRequestBase) {
    return {
        model: request.model,
        messages: [
            { role: 'developer' as const, content: request.systemPrompt },
            { role: 'user' as const, content: request.userPrompt },
        ],
        // 'none' is sent explicitly: omitting the field selects the model default
        // (medium for gpt-6-luna). The pinned SDK typing predates 'none'.
        reasoning_effort: request.reasoningEffort as ChatCompletionReasoningEffort | undefined,
        store: false,
    };
}

function createRequestOptions(signal?: AbortSignal) {
    return {
        ...OPENAI_COMPLETION_POLICY,
        ...(signal ? { signal } : {}),
    };
}

function getCompletionContent(response: {
    choices?: Array<{ message?: { content?: string | null } }>;
}): string | undefined {
    return response.choices?.[0]?.message?.content?.trim();
}

/**
 * Send a text completion request to the OpenAI chat completions API
 *
 * @param request - Text completion request parameters
 * @returns The trimmed response content, or undefined when no content is returned
 */
export async function requestTextCompletion(
    request: TextCompletionRequest,
): Promise<string | undefined> {
    const response = await request.openai.chat.completions.create(
        {
            ...createCompletionParams(request),
            max_completion_tokens: request.maxCompletionTokens,
            response_format: { type: 'text' },
        },
        createRequestOptions(request.signal),
    );

    return getCompletionContent(response);
}

/**
 * Send a structured (JSON-schema) completion request to the OpenAI chat completions API
 *
 * @param request - Structured completion request parameters including the JSON schema
 * @returns The parsed JSON response typed as T, or undefined when no content is returned
 */
export async function requestStructuredCompletion<T>(
    request: StructuredCompletionRequest,
): Promise<T | undefined> {
    const response = await request.openai.chat.completions.create(
        {
            ...createCompletionParams(request),
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: request.schemaName,
                    strict: true,
                    schema: request.schema,
                },
            },
        },
        createRequestOptions(request.signal),
    );

    const content = getCompletionContent(response);
    if (!content) {
        return undefined;
    }
    return JSON.parse(content) as T;
}
