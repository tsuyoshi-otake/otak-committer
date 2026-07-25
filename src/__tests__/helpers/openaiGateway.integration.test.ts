import * as assert from 'assert';
import * as http from 'http';
import { AddressInfo } from 'net';
import { validateApiKey } from '../../services/openaiValidation';
import { createOpenAIClient } from '../../services/openaiClient';
import { createOpenAIConnectionContext } from '../../services/openaiConnection';
import { requestTextCompletion } from '../../services/openai.completion';
import { getModelForOperation } from '../../services/openaiModels';

interface TestGateway {
    baseURL: string;
    requests: Array<{ method?: string; url?: string; authorization?: string }>;
    close: () => Promise<void>;
}

async function startGateway(handler: http.RequestListener): Promise<TestGateway> {
    const requests: TestGateway['requests'] = [];
    const server = http.createServer((request, response) => {
        requests.push({
            method: request.method,
            url: request.url,
            authorization: request.headers.authorization,
        });
        handler(request, response);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;

    return {
        baseURL: `http://127.0.0.1:${address.port}/v1`,
        requests,
        close: async () => {
            server.closeAllConnections();
            await new Promise<void>((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve())),
            );
        },
    };
}

suite('OpenAI gateway validation integration', () => {
    test('sends model validation to the configured endpoint with the configured token', async () => {
        const gateway = await startGateway((_request, response) => {
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ object: 'list', data: [] }));
        });

        try {
            const result = await validateApiKey('gateway-token', gateway.baseURL);
            assert.deepStrictEqual(result, { ok: true });
            assert.deepStrictEqual(gateway.requests, [
                {
                    method: 'GET',
                    url: '/v1/models',
                    authorization: 'Bearer gateway-token',
                },
            ]);
        } finally {
            await gateway.close();
        }
    });

    test('classifies missing model discovery as unsupported only for custom gateways', async () => {
        const gateway = await startGateway((_request, response) => {
            response.writeHead(404, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ error: { message: 'route not found' } }));
        });

        try {
            const result = await validateApiKey('gateway-token', gateway.baseURL);
            assert.strictEqual(result.ok, false);
            if (!result.ok) {
                assert.strictEqual(result.kind, 'unsupported');
                assert.strictEqual(result.status, 404);
            }
        } finally {
            await gateway.close();
        }
    });

    test('does not automatically retry validation rate limits', async () => {
        const gateway = await startGateway((_request, response) => {
            response.writeHead(429, {
                'Content-Type': 'application/json',
                'Retry-After': '60',
            });
            response.end(JSON.stringify({ error: { message: 'slow down' } }));
        });

        try {
            const startedAt = Date.now();
            const result = await validateApiKey('gateway-token', gateway.baseURL);
            const elapsed = Date.now() - startedAt;

            assert.strictEqual(result.ok, false);
            if (!result.ok) {
                assert.strictEqual(result.kind, 'rate_limit');
                assert.strictEqual(result.retryAfterSeconds, 60);
            }
            assert.strictEqual(gateway.requests.length, 1);
            assert.ok(elapsed < 5_000, `validation unexpectedly waited ${elapsed}ms`);
        } finally {
            await gateway.close();
        }
    });

    test('honors an injected validation timeout without retries', async () => {
        const gateway = await startGateway(() => {
            // Deliberately leave the response open until the test tears down the server.
        });

        try {
            const startedAt = Date.now();
            const result = await validateApiKey('gateway-token', gateway.baseURL, {
                policy: { timeout: 50, maxRetries: 0 },
            });
            const elapsed = Date.now() - startedAt;

            assert.strictEqual(result.ok, false);
            if (!result.ok) {
                assert.strictEqual(result.kind, 'network');
            }
            assert.strictEqual(gateway.requests.length, 1);
            assert.ok(elapsed < 1_000, `validation timeout took ${elapsed}ms`);
        } finally {
            await gateway.close();
        }
    });

    test('sends commit generation through the same custom gateway with GPT-5.6 Luna', async () => {
        let requestBody: Record<string, unknown> | undefined;
        const gateway = await startGateway((request, response) => {
            let rawBody = '';
            request.setEncoding('utf8');
            request.on('data', (chunk) => {
                rawBody += chunk;
            });
            request.on('end', () => {
                requestBody = JSON.parse(rawBody) as Record<string, unknown>;
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(
                    JSON.stringify({
                        id: 'chatcmpl-gateway-test',
                        object: 'chat.completion',
                        created: 1,
                        model: 'gpt-5.6-luna',
                        choices: [
                            {
                                index: 0,
                                finish_reason: 'stop',
                                message: {
                                    role: 'assistant',
                                    content: 'feat(gateway): route commit generation',
                                },
                            },
                        ],
                    }),
                );
            });
        });

        try {
            const connection = createOpenAIConnectionContext('gateway-token', gateway.baseURL);
            const result = await requestTextCompletion({
                openai: createOpenAIClient(connection),
                model: getModelForOperation('commit-message'),
                systemPrompt: 'Generate a commit message.',
                userPrompt: 'diff --git a/a.ts b/a.ts',
                maxCompletionTokens: 5000,
                reasoningEffort: 'high',
            });

            assert.strictEqual(result, 'feat(gateway): route commit generation');
            assert.strictEqual(gateway.requests.length, 1);
            assert.deepStrictEqual(gateway.requests[0], {
                method: 'POST',
                url: '/v1/chat/completions',
                authorization: 'Bearer gateway-token',
            });
            assert.strictEqual(requestBody?.model, 'gpt-5.6-luna');
            assert.strictEqual(requestBody?.reasoning_effort, 'high');
            assert.strictEqual(requestBody?.max_completion_tokens, 5000);
            assert.strictEqual(requestBody?.store, false);
            assert.deepStrictEqual(requestBody?.response_format, { type: 'text' });
            assert.deepStrictEqual(requestBody?.messages, [
                { role: 'developer', content: 'Generate a commit message.' },
                { role: 'user', content: 'diff --git a/a.ts b/a.ts' },
            ]);
        } finally {
            await gateway.close();
        }
    });
});
