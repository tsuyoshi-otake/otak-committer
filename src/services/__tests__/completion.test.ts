import * as assert from 'assert';
import { requestStructuredCompletion, requestTextCompletion } from '../openai.completion';

interface CapturedRequest {
    params: { model: string };
}

function createMockOpenAI(responses: Array<unknown>) {
    const calls: CapturedRequest[] = [];
    const openai = {
        chat: {
            completions: {
                create: async (params: CapturedRequest['params']) => {
                    calls.push({ params });
                    const next = responses.shift();
                    if (next instanceof Error) {
                        throw next;
                    }
                    return next;
                },
            },
        },
    };

    return { openai, calls };
}

function completion(content: string) {
    return {
        choices: [{ message: { content } }],
    };
}

function apiError(status: number): Error & { status: number } {
    const error = new Error(`status ${status}`) as Error & { status: number };
    error.status = status;
    return error;
}

suite('OpenAI Completion Requests', () => {
    test('requestTextCompletion should return trimmed text from the configured model', async () => {
        const { openai, calls } = createMockOpenAI([completion(' generated response ')]);

        const result = await requestTextCompletion({
            openai: openai as any,
            model: 'gpt-5.4',
            systemPrompt: 'system',
            userPrompt: 'user',
            maxCompletionTokens: 100,
            reasoningEffort: 'low',
        });

        assert.strictEqual(result, 'generated response');
        assert.deepStrictEqual(
            calls.map((call) => call.params.model),
            ['gpt-5.4'],
        );
    });

    test('requestTextCompletion should rethrow failures without fallback retry', async () => {
        const { openai, calls } = createMockOpenAI([apiError(503)]);

        await assert.rejects(
            () =>
                requestTextCompletion({
                    openai: openai as any,
                    model: 'gpt-5.4',
                    systemPrompt: 'system',
                    userPrompt: 'user',
                    maxCompletionTokens: 100,
                    reasoningEffort: undefined,
                }),
            /status 503/,
        );
        assert.strictEqual(calls.length, 1);
    });

    test('requestStructuredCompletion should parse JSON response from the configured model', async () => {
        const { openai, calls } = createMockOpenAI([
            completion('{"title":"Generated","body":"Details"}'),
        ]);

        const result = await requestStructuredCompletion<{ title: string; body: string }>({
            openai: openai as any,
            model: 'gpt-5.4',
            systemPrompt: 'system',
            userPrompt: 'user',
            reasoningEffort: 'medium',
            schemaName: 'pr_content',
            schema: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    body: { type: 'string' },
                },
                required: ['title', 'body'],
                additionalProperties: false,
            },
        });

        assert.deepStrictEqual(result, { title: 'Generated', body: 'Details' });
        assert.deepStrictEqual(
            calls.map((call) => call.params.model),
            ['gpt-5.4'],
        );
    });
});
