import * as assert from 'assert';
import { decideIssueModificationStep } from '../../commands/issue.previewDecision';

suite('Issue preview decisions', () => {
    test('returns to the action picker when the modification input is dismissed', () => {
        assert.deepStrictEqual(decideIssueModificationStep(undefined), {
            action: 'choose-again',
        });
    });

    test('returns to the action picker when the modification input is blank', () => {
        assert.deepStrictEqual(decideIssueModificationStep('  \n\t'), {
            action: 'choose-again',
        });
    });

    test('regenerates with the instructions exactly as entered', () => {
        assert.deepStrictEqual(decideIssueModificationStep(' Add repro steps '), {
            action: 'regenerate',
            instructions: ' Add repro steps ',
        });
    });
});
