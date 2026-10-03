/**
 * VS Code host tests for the `otakCommitter.openaiBaseUrl` setting contract:
 * the setting wins over OPENAI_BASE_URL for both validation and generation, and
 * an invalid value fails only the OpenAI connection, never service configuration.
 */
import * as assert from 'assert';
import * as http from 'http';
import type { AddressInfo } from 'net';
import * as vscode from 'vscode';
import { initializeOpenAIService } from '../../services/openaiInitialize';
import { getServiceConfig } from '../../services/serviceConfig';
import type { ServiceConfig } from '../../types';

suite('OpenAI base URL setting', () => {
    const settings = () => vscode.workspace.getConfiguration('otakCommitter');
    let originalSetting: string | undefined;
    let originalEnvironment: string | undefined;

    setup(() => {
        originalSetting = settings().inspect<string>('openaiBaseUrl')?.globalValue;
        originalEnvironment = process.env.OPENAI_BASE_URL;
        delete process.env.OPENAI_BASE_URL;
    });

    teardown(async () => {
        await settings().update(
            'openaiBaseUrl',
            originalSetting,
            vscode.ConfigurationTarget.Global,
        );
        if (originalEnvironment === undefined) {
            delete process.env.OPENAI_BASE_URL;
        } else {
            process.env.OPENAI_BASE_URL = originalEnvironment;
        }
    });

    test('service configuration tolerates an invalid configured base URL', async () => {
        await settings().update('openaiBaseUrl', 'not a url', vscode.ConfigurationTarget.Global);

        assert.strictEqual(getServiceConfig().openaiBaseUrl, 'not a url');
    });

    test('initialization validates and connects through the configured base URL', async () => {
        const requests: string[] = [];
        const server = http.createServer((req, res) => {
            requests.push(`${req.method} ${req.url}`);
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ object: 'list', data: [] }));
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

        try {
            const { port } = server.address() as AddressInfo;
            const baseURL = `http://127.0.0.1:${port}/v1`;
            await settings().update('openaiBaseUrl', baseURL, vscode.ConfigurationTarget.Global);

            const created = await initializeOpenAIService<Partial<ServiceConfig>>(
                { openaiApiKey: 'otak-test-key' },
                undefined,
                async (config) => config,
            );

            assert.strictEqual(created?.openaiBaseUrl, baseURL);
            assert.deepStrictEqual(requests, ['GET /v1/models']);
        } finally {
            server.closeAllConnections();
            await new Promise<void>((resolve) => server.close(() => resolve()));
        }
    });
});
