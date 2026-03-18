import OpenAI from 'openai';

export interface TextCompletionRequest {
    openai: OpenAI;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxCompletionTokens: number;
    reasoningEffort: 'low' | 'medium' | 'high' | undefined;
    temperature?: number;
    signal?: AbortSignal;
    fallbackModel?: string;
}

export interface StructuredCompletionRequest {
    openai: OpenAI;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    reasoningEffort: 'low' | 'medium' | 'high' | undefined;
    temperature?: number;
    signal?: AbortSignal;
    schemaName: string;
    schema: Record<string, unknown>;
    fallbackModel?: string;
}

export function resolveTemperature(model: string, requested?: number): number | undefined {
    if (model.startsWith('gpt-5')) {
        return undefined;
    }
    return requested ?? 0.1;
}

/** Request timeout for OpenAI API calls (2 minutes) */
const REQUEST_TIMEOUT_MS = 120000;

function isFallbackEligible(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('status' in error)) {
        return false;
    }
    const status = (error as { status: number }).status;
    return status === 429 || status === 500 || status === 502 || status === 503;
}

export async function requestTextCompletion(request: TextCompletionRequest): Promise<string | undefined> {
    try {
        const response = await request.openai.chat.completions.create(
            {
                model: request.model,
                messages: [
                    { role: 'developer', content: request.systemPrompt },
                    { role: 'user', content: request.userPrompt },
                ],
                ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
                reasoning_effort: request.reasoningEffort,
                max_completion_tokens: request.maxCompletionTokens,
                response_format: { type: 'text' },
                store: false,
            },
            { timeout: REQUEST_TIMEOUT_MS, ...(request.signal ? { signal: request.signal } : {}) },
        );

        return response.choices?.[0]?.message?.content?.trim();
    } catch (error) {
        if (!request.fallbackModel || !isFallbackEligible(error)) {
            throw error;
        }
        const fallbackTemperature = resolveTemperature(request.fallbackModel, request.temperature);
        const response = await request.openai.chat.completions.create(
            {
                model: request.fallbackModel,
                messages: [
                    { role: 'developer', content: request.systemPrompt },
                    { role: 'user', content: request.userPrompt },
                ],
                ...(fallbackTemperature !== undefined ? { temperature: fallbackTemperature } : {}),
                reasoning_effort: request.reasoningEffort,
                max_completion_tokens: request.maxCompletionTokens,
                response_format: { type: 'text' },
                store: false,
            },
            { timeout: REQUEST_TIMEOUT_MS, ...(request.signal ? { signal: request.signal } : {}) },
        );

        return response.choices?.[0]?.message?.content?.trim();
    }
}

export async function requestStructuredCompletion<T>(request: StructuredCompletionRequest): Promise<T | undefined> {
    try {
        const response = await request.openai.chat.completions.create(
            {
                model: request.model,
                messages: [
                    { role: 'developer', content: request.systemPrompt },
                    { role: 'user', content: request.userPrompt },
                ],
                ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
                reasoning_effort: request.reasoningEffort,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: request.schemaName,
                        strict: true,
                        schema: request.schema,
                    },
                },
                store: false,
            },
            { timeout: REQUEST_TIMEOUT_MS, ...(request.signal ? { signal: request.signal } : {}) },
        );

        const content = response.choices?.[0]?.message?.content?.trim();
        if (!content) {
            return undefined;
        }
        return JSON.parse(content) as T;
    } catch (error) {
        if (!request.fallbackModel || !isFallbackEligible(error)) {
            throw error;
        }
        const fallbackTemperature = resolveTemperature(request.fallbackModel, request.temperature);
        const response = await request.openai.chat.completions.create(
            {
                model: request.fallbackModel,
                messages: [
                    { role: 'developer', content: request.systemPrompt },
                    { role: 'user', content: request.userPrompt },
                ],
                ...(fallbackTemperature !== undefined ? { temperature: fallbackTemperature } : {}),
                reasoning_effort: request.reasoningEffort,
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: request.schemaName,
                        strict: true,
                        schema: request.schema,
                    },
                },
                store: false,
            },
            { timeout: REQUEST_TIMEOUT_MS, ...(request.signal ? { signal: request.signal } : {}) },
        );

        const content = response.choices?.[0]?.message?.content?.trim();
        if (!content) {
            return undefined;
        }
        return JSON.parse(content) as T;
    }
}
