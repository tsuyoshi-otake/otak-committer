import * as assert from 'assert';
import { getModelForOperation } from '../../services/openaiModels';

suite('OpenAI model routing', () => {
    test('routes the entire commit pipeline to GPT-5.6 Luna', () => {
        assert.strictEqual(getModelForOperation('commit-message'), 'gpt-5.6-luna');
        assert.strictEqual(getModelForOperation('commit-summary'), 'gpt-5.6-luna');
    });

    test('preserves GPT-5.4 for PR and generic chat operations', () => {
        assert.strictEqual(getModelForOperation('pr-content'), 'gpt-5.4');
        assert.strictEqual(getModelForOperation('generic-chat'), 'gpt-5.4');
    });
});
