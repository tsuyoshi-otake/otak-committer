import type { ValidationFailureAction } from './openaiApiKeyDialogs';
import type { ValidateApiKeyResult } from './openaiValidation';

/**
 * Verification state attached to a connection that is allowed to proceed.
 */
export type OpenAIConnectionVerification = 'validated' | 'unverified';

/**
 * Terminal or delegated state produced immediately after a validation result.
 */
export type ImmediateValidationDecision =
    | { action: 'proceed'; verification: OpenAIConnectionVerification }
    | { action: 'recover' }
    | { action: 'stop' };

/**
 * Resolve a validation result without performing UI or cache side effects.
 */
export function decideValidationResult(
    validation: ValidateApiKeyResult,
    canRecoverStoredCredential: boolean,
): ImmediateValidationDecision {
    if (validation.ok) {
        return { action: 'proceed', verification: 'validated' };
    }
    if (validation.kind === 'unsupported') {
        return { action: 'proceed', verification: 'unverified' };
    }
    return canRecoverStoredCredential ? { action: 'recover' } : { action: 'stop' };
}

/**
 * Convert every transient-validation prompt action into an explicit next state.
 */
export function decideValidationFailureAction(
    action: ValidationFailureAction,
): Exclude<ImmediateValidationDecision, { action: 'recover' }> | { action: 'retry' } {
    switch (action) {
        case 'retry':
        case 'diagnose':
            return { action: 'retry' };
        case 'continue':
            return { action: 'proceed', verification: 'unverified' };
        case 'cancel':
            return { action: 'stop' };
    }
}
