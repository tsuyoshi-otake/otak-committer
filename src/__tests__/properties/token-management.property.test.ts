/**
 * Property-Based Tests for Token Management
 *
 * Property 4: Token estimation consistency
 * Property 13: Token budget invariant
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';
import { TokenManager } from '../../services/tokenManager';

suite('Token Management Property Tests', () => {
    /**
     * Property 4: Token estimation consistency
     * *For any* text input, calculating tokens using the 4 characters per token ratio
     * should produce consistent results
     * Validates: Requirements 2.5
     */
    test('Property 4: Token estimation should be consistent (ceil(length/4))', () => {
        runPropertyTest(
            fc.property(fc.string(), (text) => {
                const expected = Math.ceil(text.length / 4);
                const actual = TokenManager.estimateTokens(text);
                return actual === expected;
            }),
        );
    });

    test('Property 4: Token estimation should always be non-negative', () => {
        runPropertyTest(
            fc.property(fc.string(), (text) => {
                return TokenManager.estimateTokens(text) >= 0;
            }),
        );
    });

    test('Property 4: Token estimation for empty string should be 0', () => {
        assert.strictEqual(TokenManager.estimateTokens(''), 0);
    });

    /**
     * Property 13: Token budget invariant
     * *For any* API request, the sum of input tokens, output tokens, and a 10,000 token
     * buffer for reasoning should not exceed 400,000 tokens
     * Validates: Requirements 6.5
     */
    test('Property 13: Token budget should never exceed 400K limit when validation passes', () => {
        runPropertyTest(
            fc.property(
                fc.integer({ min: 0, max: 400000 }),
                fc.integer({ min: 0, max: 100000 }),
                (inputTokens, outputTokens) => {
                    const isValid = TokenManager.validateAllocation(inputTokens, outputTokens);
                    const total = inputTokens + outputTokens + TokenManager.REASONING_BUFFER;

                    // If validation passes, total should be within limit
                    if (isValid) {
                        return total <= TokenManager.CONTEXT_LIMIT;
                    }
                    // If validation fails, total should exceed limit
                    return total > TokenManager.CONTEXT_LIMIT;
                },
            ),
        );
    });

    test('Property 13: validateAllocation should be consistent', () => {
        runPropertyTest(
            fc.property(
                fc.integer({ min: 0, max: 200000 }),
                fc.integer({ min: 0, max: 20000 }),
                (inputTokens, outputTokens) => {
                    // Running validation multiple times should give same result
                    const result1 = TokenManager.validateAllocation(inputTokens, outputTokens);
                    const result2 = TokenManager.validateAllocation(inputTokens, outputTokens);
                    return result1 === result2;
                },
            ),
        );
    });

    test('Truncation should produce input within token limit', () => {
        runPropertyTest(
            fc.property(
                fc.string({ minLength: 1, maxLength: 10000 }),
                fc.integer({ min: 1, max: 1000 }),
                (input, maxTokens) => {
                    const truncated = TokenManager.truncateInput(input, maxTokens);
                    const truncatedTokens = TokenManager.estimateTokens(truncated);
                    return truncatedTokens <= maxTokens;
                },
            ),
        );
    });

    test('Truncation should preserve input when within limit', () => {
        runPropertyTest(
            fc.property(fc.string({ minLength: 0, maxLength: 100 }), (input) => {
                // Use a large enough token limit
                const maxTokens = 1000;
                const truncated = TokenManager.truncateInput(input, maxTokens);
                return truncated === input;
            }),
        );
    });
});
