import * as assert from 'assert';
import {
    REDACTED,
    isSensitiveFieldName,
    redactSecrets,
    redactSensitiveJsonValue,
} from '../secretRedaction';

/** Builds a non-repeating token body so placeholder heuristics never apply. */
function body(length: number, alphabet = 'aB3dE5gH7jK9mN1pQ2rS4tU6vW8xY0z'): string {
    let result = '';
    for (let i = 0; result.length < length; i++) {
        result += alphabet[(i * 7) % alphabet.length];
    }
    return result;
}

const LETTERS = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ';

suite('secretRedaction', () => {
    suite('isSensitiveFieldName', () => {
        test('matches credential-like names in any casing or separator style', () => {
            for (const name of [
                'accessToken',
                'client_secret',
                'privateKey',
                'X-Api-Key',
                'OPENAI_API_KEY',
                'githubToken',
                'openaiApiKey',
                'password',
                'Authorization',
                'Cookie',
            ]) {
                assert.strictEqual(isSensitiveFieldName(name), true, name);
            }
        });

        test('leaves ordinary field names alone', () => {
            for (const name of ['key', 'name', 'branch', 'message', 'status', 'url']) {
                assert.strictEqual(isSensitiveFieldName(name), false, name);
            }
        });
    });

    suite('redactSecrets', () => {
        test('masks every credential format that is blocked before an AI request', () => {
            const secrets = [
                `github_pat_${body(82)}`,
                `ghr_${body(36)}`,
                `AIza${body(35)}`,
                `hf_${body(34, LETTERS)}`,
                `npm_${body(36)}`,
                `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${body(40)}.${body(43)}`,
            ];
            for (const secret of secrets) {
                const redacted = redactSecrets(`request failed for ${secret} today`);
                assert.ok(!redacted.includes(secret), `not redacted: ${secret.slice(0, 12)}`);
                assert.ok(redacted.includes(REDACTED));
            }
        });

        test('masks longer or newer variants of prefix-based tokens', () => {
            for (const secret of [`sk-${body(30)}`, `glpat-${body(26)}`, `ghp_${body(40)}`]) {
                assert.ok(!redactSecrets(secret).includes(secret), secret.slice(0, 8));
            }
        });

        test('masks the password in URL credentials but keeps the host', () => {
            const redacted = redactSecrets('fetch https://user:pa55word@example.com/repo.git');
            assert.strictEqual(redacted, `fetch https://user:${REDACTED}@example.com/repo.git`);
        });

        test('masks bearer credentials', () => {
            const redacted = redactSecrets(`Authorization: Bearer ${body(32)}`);
            assert.strictEqual(redacted, `Authorization: Bearer ${REDACTED}`);
        });

        test('leaves text without credentials unchanged', () => {
            const text = 'feat: add login page (#12) at https://example.com/docs';
            assert.strictEqual(redactSecrets(text), text);
        });
    });

    suite('redactSensitiveJsonValue', () => {
        test('masks values under sensitive names and secret substrings elsewhere', () => {
            const token = `ghp_${body(36)}`;
            const json = JSON.stringify(
                {
                    accessToken: 'plain-access-value',
                    request: { headers: { 'X-Api-Key': 'plain-header-value' } },
                    note: `token is ${token}`,
                    tokenCount: 5,
                    key: 'otak-committer.language',
                },
                redactSensitiveJsonValue,
            );
            const parsed = JSON.parse(json);

            assert.strictEqual(parsed.accessToken, REDACTED);
            assert.strictEqual(parsed.request.headers['X-Api-Key'], REDACTED);
            assert.strictEqual(parsed.note, `token is ${REDACTED}`);
            assert.strictEqual(parsed.tokenCount, 5);
            assert.strictEqual(parsed.key, 'otak-committer.language');
        });
    });
});
