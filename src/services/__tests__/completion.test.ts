import * as assert from 'assert';
import {
    StructuredCompletionError,
    requestStructuredCompletion,
    requestTextCompletion,
} from '../openai.completion';

interface CapturedRequest {
    params: { model: string; reasoning_effort?: string; max_completion_tokens?: number };
    options?: { signal?: AbortSignal };
}

function createMockOpenAI(responses: Array<unknown>) {
    const calls: CapturedRequest[] = [];
    const openai = {
        chat: {
            completions: {
                create: async (
                    params: CapturedRequest['params'],
                    options?: CapturedRequest['options'],
                ) => {
                    calls.push({ params, options });
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

const PR_SCHEMA = {
    type: 'object',
    properties: {
        title: { type: 'string' },
        body: { type: 'string' },
    },
    required: ['title', 'body'],
    additionalProperties: false,
};

function structuredRequest(openai: unknown, signal?: AbortSignal) {
    return {
        openai: openai as any,
        model: 'gpt-6-luna',
        systemPrompt: 'system',
        userPrompt: 'user',
        maxCompletionTokens: 18500,
        reasoningEffort: 'medium' as const,
        signal,
        schemaName: 'pr_content',
        schema: PR_SCHEMA,
    };
}

async function rejectsWithReason(promise: Promise<unknown>, reason: string): Promise<void> {
    await assert.rejects(promise, (error: unknown) => {
        assert.ok(error instanceof StructuredCompletionError, String(error));
        assert.strictEqual(error.reason, reason);
        return true;
    });
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
            model: 'gpt-6-luna',
            systemPrompt: 'system',
            userPrompt: 'user',
            maxCompletionTokens: 100,
            reasoningEffort: 'low',
        });

        assert.strictEqual(result, 'generated response');
        assert.deepStrictEqual(
            calls.map((call) => call.params.model),
            ['gpt-6-luna'],
        );
    });

    test('requestTextCompletion should send reasoning effort none explicitly', async () => {
        const { openai, calls } = createMockOpenAI([completion('generated')]);

        await requestTextCompletion({
            openai: openai as any,
            model: 'gpt-6-luna',
            systemPrompt: 'system',
            userPrompt: 'user',
            maxCompletionTokens: 100,
            reasoningEffort: 'none',
        });

        // Omitting the field would fall back to the model default (medium for gpt-6-luna).
        assert.strictEqual(calls[0].params.reasoning_effort, 'none');
    });

    test('requestTextCompletion should rethrow failures without fallback retry', async () => {
        const { openai, calls } = createMockOpenAI([apiError(503)]);

        await assert.rejects(
            () =>
                requestTextCompletion({
                    openai: openai as any,
                    model: 'gpt-6-luna',
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

        const result = await requestStructuredCompletion<{ title: string; body: string }>(
            structuredRequest(openai),
        );

        assert.deepStrictEqual(result, { title: 'Generated', body: 'Details' });
        assert.deepStrictEqual(
            calls.map((call) => call.params.model),
            ['gpt-6-luna'],
        );
    });

    test('requestStructuredCompletion should send the output budget and the abort signal', async () => {
        const { openai, calls } = createMockOpenAI([completion('{"title":"t","body":"b"}')]);
        const controller = new AbortController();

        await requestStructuredCompletion(structuredRequest(openai, controller.signal));

        assert.strictEqual(calls[0].params.max_completion_tokens, 18500);
        assert.strictEqual(calls[0].options?.signal, controller.signal);
    });

    test('requestStructuredCompletion should report truncation instead of a JSON parse error', async () => {
        const { openai } = createMockOpenAI([
            { choices: [{ finish_reason: 'length', message: { content: '{"title":"cut' } }] },
        ]);

        await rejectsWithReason(requestStructuredCompletion(structuredRequest(openai)), 'truncated');
    });

    test('requestStructuredCompletion should report a refusal', async () => {
        const { openai } = createMockOpenAI([
            {
                choices: [
                    { finish_reason: 'stop', message: { content: null, refusal: 'Cannot help' } },
                ],
            },
        ]);

        await rejectsWithReason(requestStructuredCompletion(structuredRequest(openai)), 'refused');
    });

    test('requestStructuredCompletion should report malformed JSON as invalid-json', async () => {
        const { openai } = createMockOpenAI([completion('not json')]);

        await rejectsWithReason(
            requestStructuredCompletion(structuredRequest(openai)),
            'invalid-json',
        );
    });
});
