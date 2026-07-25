/**
 * Property-Based Tests for OpenAI request routing
 *
 * Property 1: Operation-specific model consistency
 * Property 9-12: Output allocation properties
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';
import { TokenManager } from '../../services/tokenManager';
import {
    getModelForOperation,
    type OpenAIOperation,
} from '../../services/openaiModels';

suite('OpenAI Request Routing Property Tests', () => {
    /**
     * Property 1: model selection is a total, stable mapping by operation.
     */
    test('Property 1: every supported operation should always resolve to its designated model', () => {
        const expectedModels: Record<OpenAIOperation, string> = {
            'commit-message': 'gpt-5.6-luna',
            'commit-summary': 'gpt-5.6-luna',
            'pr-content': 'gpt-5.4',
            'generic-chat': 'gpt-5.4',
        };

        runPropertyTest(
            fc.property(
                fc.constantFrom<OpenAIOperation>(
                    'commit-message',
                    'commit-summary',
                    'pr-content',
                    'generic-chat',
                ),
                (operation) =>
                    getModelForOperation(operation) === expectedModels[operation],
            ),
        );
    });

    /**
     * Property 9: Commit message output allocation
     * *For any* commit message generation request, the system should
     * allocate 5,000 output tokens (increased for CJK languages)
     * Validates: Requirements 6.1
     */
    test('Property 9: Commit message should allocate 5000 output tokens', () => {
        assert.strictEqual(
            TokenManager.OUTPUT_TOKENS.COMMIT_MESSAGE,
            5000,
            'Commit message output tokens should be 5000',
        );
    });

    /**
     * Property 10: PR title output allocation
     * *For any* pull request title generation request, the system should
     * allocate 500 output tokens (increased for CJK languages)
     * Validates: Requirements 6.2
     */
    test('Property 10: PR title should allocate 500 output tokens', () => {
        assert.strictEqual(
            TokenManager.OUTPUT_TOKENS.PR_TITLE,
            500,
            'PR title output tokens should be 500',
        );
    });

    /**
     * Property 11: PR body output allocation
     * *For any* pull request body generation request, the system should
     * allocate 8,000 output tokens (increased for detailed descriptions)
     * Validates: Requirements 6.3
     */
    test('Property 11: PR body should allocate 8000 output tokens', () => {
        assert.strictEqual(
            TokenManager.OUTPUT_TOKENS.PR_BODY,
            8000,
            'PR body output tokens should be 8000',
        );
    });

    /**
     * Property 12: Issue output allocation
     * *For any* GitHub issue generation request, the system should
     * allocate 12,000 output tokens (increased for comprehensive issues)
     * Validates: Requirements 6.4
     */
    test('Property 12: Issue should allocate 12000 output tokens', () => {
        assert.strictEqual(
            TokenManager.OUTPUT_TOKENS.ISSUE,
            12000,
            'Issue output tokens should be 12000',
        );
    });

    test('Output allocations should be validated correctly', () => {
        runPropertyTest(
            fc.property(
                fc.constantFrom(
                    TokenManager.OUTPUT_TOKENS.COMMIT_MESSAGE,
                    TokenManager.OUTPUT_TOKENS.PR_TITLE,
                    TokenManager.OUTPUT_TOKENS.PR_BODY,
                    TokenManager.OUTPUT_TOKENS.ISSUE,
                ),
                fc.integer({ min: 0, max: TokenManager.MAX_INPUT_TOKENS }),
                (outputTokens, inputTokens) => {
                    const isValid = TokenManager.validateAllocation(inputTokens, outputTokens);
                    const total = inputTokens + outputTokens + TokenManager.REASONING_BUFFER;

                    // Validation should correctly reflect whether we're within limits
                    return isValid === total <= TokenManager.CONTEXT_LIMIT;
                },
            ),
        );
    });
});
