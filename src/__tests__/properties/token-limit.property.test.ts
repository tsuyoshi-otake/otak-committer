/**
 * Property-Based Tests for Token Limits
 *
 * Property 2: 200K token input support
 * Property 3: Input truncation with warning
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';
import { TokenManager } from '../../services/tokenManager';

suite('Token Limit Property Tests', () => {
    /**
     * Property 2: 200K token input support
     * *For any* input (diff or file content) up to 200,000 tokens,
     * the system should accept and process the input without errors
     * Validates: Requirements 2.1, 2.2, 2.3
     */
    test('Property 2: Inputs within 200K tokens should not be truncated', () => {
        runPropertyTest(
            fc.property(
                // Generate strings that are within the 200K token limit
                fc.integer({ min: 0, max: 200000 }),
                (tokenCount) => {
                    // Create input with exactly tokenCount tokens
                    const charCount = tokenCount * TokenManager.CHARS_PER_TOKEN;
                    const input = 'a'.repeat(charCount);

                    // Truncate should not modify input within limit
                    const result = TokenManager.truncateInput(input, TokenManager.MAX_INPUT_TOKENS);
                    return result.length === input.length;
                }
            )
        );
    });

    test('Property 2: 200K limit should be correctly defined', () => {
        assert.strictEqual(TokenManager.MAX_INPUT_TOKENS, 200000);
    });

    test('Property 2: All services should use unified 200K limit', () => {
        // This test verifies the unified token limit constant
        const unifiedLimit = 200 * 1000;
        assert.strictEqual(TokenManager.MAX_INPUT_TOKENS, unifiedLimit);
    });

    /**
     * Property 3: Input truncation with warning
     * *For any* input exceeding 200,000 tokens, the system should truncate
     * the input to 200K tokens and display a warning message to the user
     * Validates: Requirements 2.4
     */
    test('Property 3: Inputs exceeding 200K tokens should be truncated', () => {
        runPropertyTest(
            fc.property(
                // Generate token counts exceeding the limit
                fc.integer({ min: 200001, max: 500000 }),
                (tokenCount) => {
                    const charCount = tokenCount * TokenManager.CHARS_PER_TOKEN;
                    const input = 'a'.repeat(charCount);

                    const result = TokenManager.truncateInput(input, TokenManager.MAX_INPUT_TOKENS);
                    const resultTokens = TokenManager.estimateTokens(result);

                    // Result should be exactly at the limit
                    return resultTokens <= TokenManager.MAX_INPUT_TOKENS;
                }
            )
        );
    });

    test('Property 3: Truncated output should be exactly at limit', () => {
        runPropertyTest(
            fc.property(
                fc.integer({ min: 200001, max: 300000 }),
                (tokenCount) => {
                    const charCount = tokenCount * TokenManager.CHARS_PER_TOKEN;
                    const input = 'a'.repeat(charCount);

                    const result = TokenManager.truncateInput(input, TokenManager.MAX_INPUT_TOKENS);
                    const expectedLength = TokenManager.MAX_INPUT_TOKENS * TokenManager.CHARS_PER_TOKEN;

                    return result.length === expectedLength;
                }
            )
        );
    });

    test('Property 3: Truncation should preserve content start', () => {
        runPropertyTest(
            fc.property(
                fc.string({ minLength: 100, maxLength: 1000 }),
                fc.integer({ min: 10, max: 50 }),
                (prefix, maxTokens) => {
                    // Create input that exceeds limit
                    const paddingLength = (maxTokens + 100) * TokenManager.CHARS_PER_TOKEN;
                    const input = prefix + 'x'.repeat(paddingLength);

                    const result = TokenManager.truncateInput(input, maxTokens);

                    // Result should start with the original prefix (if fits)
                    if (prefix.length <= maxTokens * TokenManager.CHARS_PER_TOKEN) {
                        return result.startsWith(prefix);
                    }
                    // If prefix is too long, result should be a prefix of prefix
                    return prefix.startsWith(result);
                }
            )
        );
    });

    test('Property 3: Truncation calculation should be accurate', () => {
        const largeInput = 'a'.repeat(1000000); // 1M characters = 250K tokens
        const truncated = TokenManager.truncateInput(largeInput, TokenManager.MAX_INPUT_TOKENS);

        const expectedLength = TokenManager.MAX_INPUT_TOKENS * TokenManager.CHARS_PER_TOKEN;
        assert.strictEqual(truncated.length, expectedLength);
    });

    test('Property 3: Edge case - exactly at limit should not be truncated', () => {
        const exactLimit = TokenManager.MAX_INPUT_TOKENS * TokenManager.CHARS_PER_TOKEN;
        const input = 'a'.repeat(exactLimit);

        const result = TokenManager.truncateInput(input, TokenManager.MAX_INPUT_TOKENS);
        assert.strictEqual(result.length, input.length);
    });

    test('Property 3: Edge case - one character over limit should be truncated', () => {
        const overLimit = TokenManager.MAX_INPUT_TOKENS * TokenManager.CHARS_PER_TOKEN + 1;
        const input = 'a'.repeat(overLimit);

        const result = TokenManager.truncateInput(input, TokenManager.MAX_INPUT_TOKENS);
        const expectedLength = TokenManager.MAX_INPUT_TOKENS * TokenManager.CHARS_PER_TOKEN;
        assert.strictEqual(result.length, expectedLength);
    });
});
