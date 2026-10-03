import * as assert from 'assert';
import { ValidationError } from '../../types/errors/ValidationError';
import { sanitizeForLogging } from '../../infrastructure/logging/logSanitizer';
import { formatErrorDetail } from '../../infrastructure/error/formatErrorDetail';

const GITHUB_TOKEN = `ghp_${'aB3dE5gH7jK9mN1pQ2rS4tU6vW8xY0zC2eF4'}`;

suite('Error and log redaction share one rule set', () => {
    const error = new ValidationError('Request failed', {
        accessToken: 'plain-access-value',
        githubToken: 'plain-github-value',
        openaiApiKey: 'plain-openai-value',
        remote: 'https://user:pa55word@example.com/repo.git',
        detail: `server echoed ${GITHUB_TOKEN}`,
        key: 'otak-committer.language',
    });
    const leakedValues = [
        'plain-access-value',
        'plain-github-value',
        'plain-openai-value',
        'pa55word',
        GITHUB_TOKEN,
    ];

    test('formatErrorDetail masks camelCase credential fields and embedded secrets', () => {
        const text = formatErrorDetail(error);

        for (const leaked of leakedValues) {
            assert.ok(!text.includes(leaked), `leaked ${leaked.slice(0, 10)}`);
        }
        assert.ok(text.includes('"key":"otak-committer.language"'));
        assert.ok(text.startsWith('ValidationError [VALIDATION_ERROR]: Request failed | Context: '));
    });

    test('BaseError.toString never serializes context', () => {
        assert.strictEqual(error.toString(), 'ValidationError [VALIDATION_ERROR]: Request failed');
    });

    test('formatErrorDetail renders plain errors and non-errors unchanged', () => {
        assert.strictEqual(formatErrorDetail(new Error('boom')), 'boom');
        assert.strictEqual(formatErrorDetail('text'), 'text');
        assert.strictEqual(
            formatErrorDetail(new ValidationError('No context')),
            'ValidationError [VALIDATION_ERROR]: No context',
        );
    });

    test('log sanitization masks the same fields and values', () => {
        const sanitized = sanitizeForLogging({
            accessToken: 'plain-access-value',
            detail: `server echoed ${GITHUB_TOKEN}`,
        }) as Record<string, string>;

        assert.strictEqual(sanitized.accessToken, '[REDACTED]');
        assert.strictEqual(sanitized.detail, 'server echoed [REDACTED]');
    });

    test('log sanitization masks secrets in Error messages', () => {
        const sanitized = sanitizeForLogging(new Error(`push failed: ${GITHUB_TOKEN}`)) as {
            message: string;
        };

        assert.strictEqual(sanitized.message, 'push failed: [REDACTED]');
    });
});
