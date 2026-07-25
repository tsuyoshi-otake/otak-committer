import * as assert from 'assert';
import {
    DEFAULT_OPENAI_BASE_URL,
    OpenAIBaseUrlError,
    createOpenAIConnectionContext,
    isOfficialOpenAIBaseUrl,
    resolveOpenAIBaseUrl,
} from '../../services/openaiConnection';

suite('OpenAI connection resolution', () => {
    test('uses the official endpoint when neither source is configured', () => {
        assert.strictEqual(resolveOpenAIBaseUrl(undefined, undefined), DEFAULT_OPENAI_BASE_URL);
    });

    test('prefers the VS Code setting over OPENAI_BASE_URL', () => {
        assert.strictEqual(
            resolveOpenAIBaseUrl(
                'https://configured.example/openai/v1/',
                'https://environment.example/v1',
            ),
            'https://configured.example/openai/v1',
        );
    });

    test('uses OPENAI_BASE_URL when the setting is blank', () => {
        assert.strictEqual(
            resolveOpenAIBaseUrl('  ', 'https://environment.example/v1/'),
            'https://environment.example/v1',
        );
    });

    test('preserves a custom path and canonicalizes trailing slashes', () => {
        assert.strictEqual(
            resolveOpenAIBaseUrl('https://gateway.example/custom/api///'),
            'https://gateway.example/custom/api',
        );
    });

    test('allows exact loopback HTTP hosts including bracketed IPv6', () => {
        assert.strictEqual(
            resolveOpenAIBaseUrl('http://localhost:8080/v1'),
            'http://localhost:8080/v1',
        );
        assert.strictEqual(
            resolveOpenAIBaseUrl('http://127.0.0.1:8080/v1'),
            'http://127.0.0.1:8080/v1',
        );
        assert.strictEqual(resolveOpenAIBaseUrl('http://[::1]:8080/v1'), 'http://[::1]:8080/v1');
    });

    test('rejects non-loopback and wildcard-like localhost HTTP hosts', () => {
        assert.throws(
            () => resolveOpenAIBaseUrl('http://192.168.1.10:8080/v1'),
            OpenAIBaseUrlError,
        );
        assert.throws(
            () => resolveOpenAIBaseUrl('http://api.localhost:8080/v1'),
            OpenAIBaseUrlError,
        );
    });

    test('rejects unsupported schemes, relative URLs, credentials, query, and fragment', () => {
        const invalidValues = [
            '/v1',
            'ftp://gateway.example/v1',
            'https://user:password@gateway.example/v1',
            'https://gateway.example/v1?tenant=a',
            'https://gateway.example/v1#fragment',
        ];

        for (const value of invalidValues) {
            assert.throws(() => resolveOpenAIBaseUrl(value), OpenAIBaseUrlError, value);
        }
    });

    test('identifies only the canonical OpenAI endpoint as official', () => {
        assert.strictEqual(isOfficialOpenAIBaseUrl('https://api.openai.com/v1/'), true);
        assert.strictEqual(isOfficialOpenAIBaseUrl('https://gateway.example/v1'), false);
    });

    test('creates an immutable connection identity from trimmed credentials', () => {
        assert.deepStrictEqual(
            createOpenAIConnectionContext('  custom-token  ', 'https://gateway.example/openai/v1/'),
            {
                apiKey: 'custom-token',
                baseURL: 'https://gateway.example/openai/v1',
                isOfficial: false,
            },
        );
    });
});
