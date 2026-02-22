import * as assert from 'assert';
import { detectPotentialSecrets } from '../secretDetection';

suite('Secret Detection Utility', () => {
    test('detects OpenAI project API keys', () => {
        const diff = '+ OPENAI_API_KEY=sk-proj-1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123456';

        const result = detectPotentialSecrets(diff);

        assert.strictEqual(result.hasPotentialSecrets, true);
        assert.ok(result.matchedPatternIds.includes('openai_project_api_key'));
    });

    test('detects context-based secret variable assignments', () => {
        const diff = '+ NEXT_PUBLIC_PAYMENT_TOKEN=demo-token-value';

        const result = detectPotentialSecrets(diff);

        assert.strictEqual(result.hasPotentialSecrets, true);
        assert.ok(result.matchedPatternIds.includes('public_env_secret_reference'));
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
});
