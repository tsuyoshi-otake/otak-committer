import OpenAI from 'openai';
import type { ChatCompletionReasoningEffort } from 'openai/resources/chat/completions';
import type { ReasoningEffort } from '../types/enums/ReasoningEffort';
import { OpenAIServiceError } from '../types/errors/ServiceError';
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
    /** Output budget; reasoning tokens count against it as well */
    maxCompletionTokens: number;
    reasoningEffort: ReasoningEffort | undefined;
    signal?: AbortSignal;
    schemaName: string;
    schema: Record<string, unknown>;
}

/**
 * Why a structured completion produced no usable JSON object:
 * - `truncated`: generation hit `max_completion_tokens` (`finish_reason: length`)
 * - `refused`: the model returned a refusal instead of schema output
 * - `invalid-json`: the content was not parseable JSON
 */
export type StructuredCompletionFailure = 'truncated' | 'refused' | 'invalid-json';

/**
 * Thrown when a JSON-schema completion cannot yield a parsed object, so callers
 * report the actual cause instead of a JSON.parse SyntaxError.
 */
export class StructuredCompletionError extends OpenAIServiceError {
    constructor(
        public readonly reason: StructuredCompletionFailure,
        message: string,
    ) {
        super(message, { reason });
    }
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
 * @throws {StructuredCompletionError} When the output was truncated, refused, or not JSON
 */
export async function requestStructuredCompletion<T>(
    request: StructuredCompletionRequest,
): Promise<T | undefined> {
    const response = await request.openai.chat.completions.create(
        {
            ...createCompletionParams(request),
            max_completion_tokens: request.maxCompletionTokens,
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

    const choice = response.choices?.[0];
    const refusal = choice?.message?.refusal;
    if (refusal) {
        throw new StructuredCompletionError(
            'refused',
            `The model declined to generate the response: ${refusal}`,
        );
    }
    if (choice?.finish_reason === 'length') {
        throw new StructuredCompletionError(
            'truncated',
            `The response hit the ${request.maxCompletionTokens}-token output limit before the JSON was complete`,
        );
    }

    const content = getCompletionContent(response);
    if (!content) {
        return undefined;
    }
    try {
        return JSON.parse(content) as T;
    } catch {
        throw new StructuredCompletionError(
            'invalid-json',
            'The model returned malformed JSON for a schema-constrained response',
        );
    }
}
