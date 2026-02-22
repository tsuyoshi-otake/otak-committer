import OpenAI from 'openai';

export interface TextCompletionRequest {
    openai: OpenAI;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxCompletionTokens: number;
    reasoningEffort: 'low' | 'medium' | 'high' | undefined;
    temperature?: number;
}

export function resolveTemperature(model: string, requested?: number): number | undefined {
    if (model.startsWith('gpt-5')) {
        return undefined;
    }
    return requested ?? 0.1;
}

/** Request timeout for OpenAI API calls (2 minutes) */
const REQUEST_TIMEOUT_MS = 120000;

export async function requestTextCompletion(request: TextCompletionRequest): Promise<string | undefined> {
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
        { timeout: REQUEST_TIMEOUT_MS },
    );

    return response.choices?.[0]?.message?.content?.trim();
}
