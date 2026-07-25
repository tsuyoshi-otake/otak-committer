import * as assert from 'assert';
import {
    OPENAI_COMPLETION_POLICY,
    OPENAI_VALIDATION_POLICY,
} from '../../services/openaiRequestPolicy';

suite('OpenAI request policies', () => {
    test('bounds validation at 30 seconds with retry ownership outside the SDK', () => {
        assert.deepStrictEqual(OPENAI_VALIDATION_POLICY, {
            timeout: 30_000,
            maxRetries: 0,
        });
    });

    test('bounds completion requests at two minutes and two SDK retries', () => {
        assert.deepStrictEqual(OPENAI_COMPLETION_POLICY, {
            timeout: 120_000,
            maxRetries: 2,
        });
    });
});
