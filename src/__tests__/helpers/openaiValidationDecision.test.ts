import * as assert from 'assert';
import {
    decideValidationFailureAction,
    decideValidationResult,
} from '../../services/openaiValidationDecision';
import type { ValidateApiKeyResult, ValidationKind } from '../../services/openaiValidation';

suite('OpenAI initialization decisions', () => {
    test('marks only a successful preflight as validated', () => {
        assert.deepStrictEqual(decideValidationResult({ ok: true }, false), {
            action: 'proceed',
            verification: 'validated',
        });
    });

    test('lets a gateway without model discovery proceed unverified', () => {
        assert.deepStrictEqual(
            decideValidationResult(
                {
                    ok: false,
                    kind: 'unsupported',
                    status: 404,
                    reason: 'route not found',
                },
                false,
            ),
            { action: 'proceed', verification: 'unverified' },
        );
    });

    test('sends every other stored-key failure to recovery and stops explicit keys', () => {
        const failureKinds: ValidationKind[] = [
            'auth',
            'rate_limit',
            'network',
            'server',
            'unknown',
        ];

        for (const kind of failureKinds) {
            const result: ValidateApiKeyResult = {
                ok: false,
                kind,
                reason: kind,
            };
            assert.deepStrictEqual(decideValidationResult(result, true), {
                action: 'recover',
            });
            assert.deepStrictEqual(decideValidationResult(result, false), {
                action: 'stop',
            });
        }
    });

    test('maps every transient-failure prompt branch to a terminal or retry state', () => {
        assert.deepStrictEqual(decideValidationFailureAction('retry'), {
            action: 'retry',
        });
        assert.deepStrictEqual(decideValidationFailureAction('diagnose'), {
            action: 'retry',
        });
        assert.deepStrictEqual(decideValidationFailureAction('continue'), {
            action: 'proceed',
            verification: 'unverified',
        });
        assert.deepStrictEqual(decideValidationFailureAction('cancel'), {
            action: 'stop',
        });
    });
});
