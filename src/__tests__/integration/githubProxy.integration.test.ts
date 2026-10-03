/**
 * VS Code host test for the GitHub client's proxy contract: requests leave through
 * VS Code's `http.proxy` (the extension host's global fetch), with the proxy
 * credentials sent only to the proxy and the GitHub token never sent in the clear.
 */
import * as assert from 'assert';
import * as net from 'net';
import type { AddressInfo } from 'net';
import * as vscode from 'vscode';
import { createGitHubClient } from '../../services/github.init';

interface ProxyRequest {
    requestLine: string;
    proxyAuthorization: string | undefined;
    raw: string;
}

/**
 * Starts a proxy that records each CONNECT request head and refuses the tunnel
 */
async function startRecordingProxy(): Promise<{ server: net.Server; requests: ProxyRequest[] }> {
    const requests: ProxyRequest[] = [];
    const server = net.createServer((socket) => {
        socket.on('error', () => undefined);
        socket.once('data', (chunk) => {
            const raw = chunk.toString('latin1');
            const lines = raw.split('\r\n\r\n')[0].split('\r\n');
            const authorization = lines.find((line) => /^proxy-authorization:/i.test(line));
            requests.push({
                requestLine: lines[0],
                proxyAuthorization: authorization?.slice(authorization.indexOf(':') + 1).trim(),
                raw,
            });
            socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n');
        });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    return { server, requests };
}

async function waitForSetting(name: string, expected: unknown): Promise<void> {
    for (let attempt = 0; attempt < 50; attempt++) {
        if (vscode.workspace.getConfiguration('http').get(name) === expected) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.fail(`http.${name} did not change to the expected value`);
}

suite('GitHub client proxy routing', function () {
    this.timeout(20000);
    const http = () => vscode.workspace.getConfiguration('http');
    let originalProxy: string | undefined;
    let proxy: { server: net.Server; requests: ProxyRequest[] } | undefined;

    setup(() => {
        originalProxy = http().inspect<string>('proxy')?.globalValue;
    });

    teardown(async () => {
        await http().update('proxy', originalProxy, vscode.ConfigurationTarget.Global);
        await new Promise<void>((resolve) =>
            proxy ? proxy.server.close(() => resolve()) : resolve(),
        );
        proxy = undefined;
    });

    test('sends GitHub API requests through http.proxy without exposing the token', async () => {
        proxy = await startRecordingProxy();
        const { port } = proxy.server.address() as AddressInfo;
        const proxyUrl = `http://proxy-user:proxy-pass@127.0.0.1:${port}`;
        await http().update('proxy', proxyUrl, vscode.ConfigurationTarget.Global);
        await waitForSetting('proxy', proxyUrl);

        const token = 'test-github-token-for-proxy-routing';
        const octokit = await createGitHubClient(token);
        await assert.rejects(octokit.repos.listBranches({ owner: 'octocat', repo: 'hello-world' }));

        const github = proxy.requests.filter((request) =>
            request.requestLine.startsWith('CONNECT api.github.com:443 '),
        );
        assert.strictEqual(
            github.length,
            1,
            JSON.stringify(proxy.requests.map((r) => r.requestLine)),
        );
        assert.strictEqual(
            github[0].proxyAuthorization,
            `Basic ${Buffer.from('proxy-user:proxy-pass').toString('base64')}`,
        );
        assert.ok(!github[0].raw.includes(token), 'the GitHub token reached the proxy');
    });
});
