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
});
