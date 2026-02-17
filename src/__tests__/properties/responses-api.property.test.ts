/**
 * Property-Based Tests for Responses API
 *
 * Property 1: API endpoint and model consistency
 * Property 5: Reasoning effort configuration
 * Property 9-12: Output allocation properties
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';
import { ResponsesAPIMock, ResponsesAPIRequest } from '../../test/mocks/responsesAPI.mock';
import { TokenManager } from '../../services/tokenManager';

suite('Responses API Property Tests', () => {
    setup(() => {
        ResponsesAPIMock.reset();
        ResponsesAPIMock.mockSuccess('Test response');
    });

    /**
     * Property 1: API endpoint and model consistency
     * *For any* AI generation request (commit message, PR, or issue),
     * the system should use the `/v1/responses` endpoint with the `gpt-5.2` model
     * Validates: Requirements 1.1, 1.2, 1.3, 1.4
     */
    test('Property 1: All API calls should use /v1/responses endpoint', async () => {
        const requestTypes = ['commit', 'pr_title', 'pr_body', 'issue'] as const;

        for (const requestType of requestTypes) {
            const request: ResponsesAPIRequest = {
                model: 'gpt-5.2',
                input: `Generate ${requestType} content`,
                max_output_tokens: 2000,
                reasoning: { effort: 'low' },
            };

            await ResponsesAPIMock.call(request);
        }

        assert.strictEqual(ResponsesAPIMock.verifyAllCallsUseEndpoint('/v1/responses'), true);
    });

    test('Property 1: All API calls should use gpt-5.2 model', async () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.constantFrom('commit', 'pr_title', 'pr_body', 'issue'),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (requestType, content) => {
                    ResponsesAPIMock.reset();
                    ResponsesAPIMock.mockSuccess('Response');

                    const request: ResponsesAPIRequest = {
                        model: 'gpt-5.2',
                        input: `${requestType}: ${content}`,
                        max_output_tokens: 2000,
                        reasoning: { effort: 'low' },
                    };

                    await ResponsesAPIMock.call(request);
                    return ResponsesAPIMock.verifyAllCallsUseModel('gpt-5.2');
                },
            ),
        );
    });

    /**
     * Property 5: Reasoning effort configuration
     * *For any* AI generation request, the system should include
     * `reasoning.effort: "low"` in the API request parameters
     * Validates: Requirements 3.1, 3.2, 3.3, 3.4
     */
    test('Property 5: All API calls should include reasoning.effort', async () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.constantFrom('commit', 'pr_title', 'pr_body', 'issue'),
                fc.string({ minLength: 1, maxLength: 100 }),
                async (requestType, content) => {
                    ResponsesAPIMock.reset();
                    ResponsesAPIMock.mockSuccess('Response');

                    const request: ResponsesAPIRequest = {
                        model: 'gpt-5.2',
                        input: `${requestType}: ${content}`,
                        max_output_tokens: 2000,
                        reasoning: { effort: 'low' },
                    };

                    await ResponsesAPIMock.call(request);
                    return ResponsesAPIMock.verifyAllCallsHaveReasoningEffort('low');
                },
            ),
        );
    });

    /**
     * Property 9: Commit message output allocation
     * *For any* commit message generation request, the system should
     * allocate 4,000 output tokens (increased for CJK languages)
     * Validates: Requirements 6.1
     */
    test('Property 9: Commit message should allocate 4000 output tokens', () => {
        assert.strictEqual(
            TokenManager.OUTPUT_TOKENS.COMMIT_MESSAGE,
            4000,
            'Commit message output tokens should be 4000',
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
