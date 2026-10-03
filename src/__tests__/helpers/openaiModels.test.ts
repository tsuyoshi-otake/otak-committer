import * as assert from 'assert';
import { getModelForOperation, type OpenAIOperation } from '../../services/openaiModels';

suite('OpenAI model routing', () => {
    test('routes every operation to GPT-6 Luna by default', () => {
        const operations: OpenAIOperation[] = [
            'commit-message',
            'commit-summary',
            'pr-content',
            'generic-chat',
        ];
        for (const operation of operations) {
            assert.strictEqual(getModelForOperation(operation), 'gpt-6-luna', operation);
        }
    });
});
