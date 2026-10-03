import * as assert from 'assert';
import { detectPotentialSecrets } from '../secretDetection';

suite('Secret Detection Utility', () => {
    test('detects OpenAI project API keys by value format', () => {
        const diff = '+ OPENAI_API_KEY=sk-proj-1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';

        const result = detectPotentialSecrets(diff);

        assert.strictEqual(result.hasPotentialSecrets, true);
        assert.ok(result.matchedPatternIds.includes('openai_project_api_key'));
    });

    test('detects secrets by value format regardless of variable name', () => {
        const diff = '+ const key = "sk-proj-1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"';

        const result = detectPotentialSecrets(diff);

        assert.strictEqual(result.hasPotentialSecrets, true);
        assert.ok(result.matchedPatternIds.includes('openai_project_api_key'));
    });

    test('does not flag regular code changes', () => {
        const diff = `diff --git a/src/app.ts b/src/app.ts
+ const message = 'hello world'
+ export default message`;

        const result = detectPotentialSecrets(diff);

        assert.strictEqual(result.hasPotentialSecrets, false);
        assert.strictEqual(result.matchedPatternIds.length, 0);
    });

    test('respects the maxMatches limit', () => {
        const diff = [
            '+ AWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF',
            '+ const github = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"',
            '+ const openai = "sk-proj-1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"',
        ].join('\n');

        const result = detectPotentialSecrets(diff, 2);

        assert.strictEqual(result.hasPotentialSecrets, true);
        assert.strictEqual(result.matchedPatternIds.length, 2);
    });

    test('does not flag variable names without actual secret values', () => {
        const diff = [
            '+ OPENAI_API_KEY=your-key-here',
            '+ OPENAI_API_KEY=',
            '+ OPENAI_API_KEY=""',
            '+ OPENAI_API_KEY=${OPENAI_API_KEY}',
            '+ OPENAI_API_KEY=<your-key>',
            '+ OPENAI_API_KEY=placeholder',
            '+ OPENAI_API_KEY=changeme',
            '+ OPENAI_API_KEY=custom_token_abc123def456ghi789',
            '+ const key = process.env.OPENAI_API_KEY;',
            '+ ANTHROPIC_API_KEY=test-key-value',
        ].join('\n');

        const result = detectPotentialSecrets(diff);

        assert.strictEqual(result.hasPotentialSecrets, false);
    });

    test('does not flag placeholder values with repeated characters', () => {
        const diff = [
            '+ sk-proj-' + 'x'.repeat(40),
            '+ ghp_' + 'X'.repeat(36),
            '+ sk-ant-' + '0'.repeat(20),
            '+ AKIA' + 'A'.repeat(16),
        ].join('\n');

        const result = detectPotentialSecrets(diff);

        assert.strictEqual(result.hasPotentialSecrets, false);
    });

    test('detects real secret even when placeholder of same format appears first', () => {
        const diff = [
            '+ sk-proj-' + 'x'.repeat(40),
            '+ sk-proj-1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456',
        ].join('\n');

        const result = detectPotentialSecrets(diff);

        assert.strictEqual(result.hasPotentialSecrets, true);
        assert.ok(result.matchedPatternIds.includes('openai_project_api_key'));
    });

    test('detects GCP service account JSON structure', () => {
        const diff = '+ "type": "service_account"';

        const result = detectPotentialSecrets(diff);

        assert.strictEqual(result.hasPotentialSecrets, true);
        assert.ok(result.matchedPatternIds.includes('service_account_json_type'));
    });

    test('detects base64url OpenAI and Anthropic keys containing "-" and "_"', () => {
        const cases: Array<[string, string]> = [
            ['sk-proj-Ab3_dE-9fGhIjKlMnOpQrStUvWxYz012345', 'openai_project_api_key'],
            ['sk-admin-Ab3_dE-9fGhIjKlMnOpQrStUvWxYz012345', 'openai_admin_api_key'],
            ['sk-svcacct-Ab3_dE-9fGhIjKlMnOpQrStUvWxYz012345', 'openai_service_account_key'],
            ['sk-or-v1-0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f', 'openai_org_key'],
            ['sk-ant-api03-Ab3_dE-9fGhIjKlMnOpQrStUvWxYz0123', 'anthropic_api_key'],
        ];

        for (const [key, patternId] of cases) {
            const result = detectPotentialSecrets(`+ API_KEY="${key}"`, 50);
            assert.ok(result.matchedPatternIds.includes(patternId), `${patternId}: ${key}`);
        }
    });

    test('detects a Neon connection string with a password', () => {
        const diff = '+ DATABASE_URL=postgres://user:s3cret@ep-cool-1.us-east-2.aws.neon.tech/db';

        const result = detectPotentialSecrets(diff, 50);

        assert.ok(result.matchedPatternIds.includes('neon_connection_string_with_password'));
    });

    test('scans long single-line connection-string-like input in linear time', () => {
        // Each input previously took several seconds because an unbounded segment
        // rescanned the rest of the line from every scheme occurrence.
        const inputs = [
            'postgres://a:b@x '.repeat(20000),
            'postgres://a:b'.repeat(25000),
            'mongodb://a:b'.repeat(25000),
            'mysql://a:b'.repeat(30000),
            'redis://:b'.repeat(35000),
        ];

        for (const input of inputs) {
            const started = Date.now();
            detectPotentialSecrets(input, 50);
            const elapsed = Date.now() - started;
            assert.ok(elapsed < 750, `${input.slice(0, 16)}... took ${elapsed}ms`);
        }
    });

    test('detects a signed JWT', () => {
        const jwt =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
            '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
            '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

        const result = detectPotentialSecrets(`+ Authorization: Bearer ${jwt}`, 50);

        assert.ok(result.matchedPatternIds.includes('jwt_token'));
    });

    test('scans long JWT-like runs of dots in linear time', () => {
        // The JWT pattern used to allow '.' inside segments, so a header followed by
        // a long run of dots backtracked quadratically (84 s at 340 KB).
        const header = 'eyJhbGciOiJ' + 'A'.repeat(20);
        const inputs = [
            header + '.'.repeat(340000),
            (header + '.').repeat(10000),
            ('eyJhbGciOiJIUzI1NiJ9.' + '.'.repeat(79)).repeat(3400),
        ];

        for (const input of inputs) {
            const started = Date.now();
            detectPotentialSecrets(input, 50);
            const elapsed = Date.now() - started;
            assert.ok(elapsed < 750, `${input.slice(0, 40)}... took ${elapsed}ms`);
        }
    });
});
