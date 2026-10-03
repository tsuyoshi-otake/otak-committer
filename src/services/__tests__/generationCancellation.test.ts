import * as assert from 'assert';
import { generateTitle } from '../issueGenerator.prompts';
import { generatePRContentOp } from '../openai.ops';
import { TokenManager } from '../tokenManager';

const silentLogger = {
    debug: () => undefined,
    info: () => undefined,
    warning: () => undefined,
    error: () => undefined,
};

function abortError(): Error {
    return Object.assign(new Error('Request was aborted.'), { name: 'AbortError' });
}

suite('Generation requests honor cancellation', () => {
    test('generateTitle forwards the signal to the chat completion', async () => {
        const controller = new AbortController();
        let received: AbortSignal | undefined;
        const openai = {
            createChatCompletion: async (params: { signal?: AbortSignal }) => {
                received = params.signal;
                return 'Title';
            },
        };

        await generateTitle(openai, 'bug', 'desc', 'english', silentLogger, controller.signal);

        assert.strictEqual(received, controller.signal);
    });

    test('generateTitle rethrows an abort instead of falling back to the description', async () => {
        const openai = {
            createChatCompletion: async () => {
                throw abortError();
            },
        };

        await assert.rejects(
            generateTitle(openai, 'bug', 'desc', 'english', silentLogger),
            /Request was aborted/,
        );
    });

    test('generateTitle still falls back to the description on other failures', async () => {
        const openai = {
            createChatCompletion: async () => {
                throw new Error('status 500');
            },
        };

        const title = await generateTitle(openai, 'bug', 'a short description', 'english', silentLogger);

        assert.strictEqual(title, 'a short description');
    });

    test('generatePRContentOp sends the PR output budget and the abort signal', async () => {
        const controller = new AbortController();
        const calls: Array<{ params: { max_completion_tokens?: number }; options?: { signal?: AbortSignal } }> = [];
        const context = {
            openai: {
                chat: {
                    completions: {
                        create: async (
                            params: { max_completion_tokens?: number },
                            options?: { signal?: AbortSignal },
                        ) => {
                            calls.push({ params, options });
                            return {
                                choices: [
                                    {
                                        finish_reason: 'stop',
                                        message: { content: '{"title":"feat: x","body":"Body"}' },
                                    },
                                ],
                            };
                        },
                    },
                },
            },
            promptService: { createPRPrompt: async () => 'prompt' },
            logger: silentLogger,
            model: 'gpt-6-luna',
            getReasoningEffort: () => 'high' as const,
            onAuthError: async () => undefined,
            showError: () => undefined,
            isAuthenticationError: () => false,
            onRequestSuccess: () => undefined,
            signal: controller.signal,
        };

        const result = await generatePRContentOp(
            context as unknown as Parameters<typeof generatePRContentOp>[0],
            { base: 'main', compare: 'feature', files: [], stats: { additions: 0, deletions: 0 } } as unknown as Parameters<typeof generatePRContentOp>[1],
            'english',
        );

        assert.ok(result);
        assert.strictEqual(calls.length, 1);
        assert.strictEqual(
            calls[0].params.max_completion_tokens,
            TokenManager.PR_CONTENT_COMPLETION_TOKENS,
        );
        assert.strictEqual(calls[0].options?.signal, controller.signal);
    });
});
