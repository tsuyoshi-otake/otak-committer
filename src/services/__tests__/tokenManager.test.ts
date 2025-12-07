/**
 * TokenManager Unit Tests
 * Tests for token estimation, truncation, and validation
 */

import * as assert from 'assert';
import { TokenManager } from '../tokenManager';

suite('TokenManager', () => {
    suite('estimateTokens', () => {
        test('should estimate tokens using 4 chars per token ratio', () => {
            // 8 characters = 2 tokens
            assert.strictEqual(TokenManager.estimateTokens('12345678'), 2);
        });

        test('should round up for partial tokens', () => {
            // 5 characters = 2 tokens (ceil(5/4))
            assert.strictEqual(TokenManager.estimateTokens('12345'), 2);
        });

        test('should return 0 for empty string', () => {
            assert.strictEqual(TokenManager.estimateTokens(''), 0);
        });

        test('should handle multi-byte characters correctly', () => {
            // Japanese characters are multi-byte but counted by string length
            const jaText = 'abc'; // 12 bytes in UTF-8, but 3 chars
            assert.strictEqual(TokenManager.estimateTokens(jaText), 1);
        });
    });

    suite('truncateInput', () => {
        test('should not truncate if within limit', () => {
            const input = 'a'.repeat(100);
            const result = TokenManager.truncateInput(input, 30); // 30 tokens = 120 chars
            assert.strictEqual(result, input);
        });

        test('should truncate if exceeding limit', () => {
            const input = 'a'.repeat(200);
            const result = TokenManager.truncateInput(input, 30); // 30 tokens = 120 chars
            assert.strictEqual(result.length, 120);
        });

        test('should truncate to exactly maxTokens * 4 chars', () => {
            const input = 'a'.repeat(1000);
            const maxTokens = 100;
            const result = TokenManager.truncateInput(input, maxTokens);
            assert.strictEqual(result.length, maxTokens * TokenManager.CHARS_PER_TOKEN);
        });
    });

    suite('validateAllocation', () => {
        test('should return true when within context limit', () => {
            const inputTokens = 100000;
            const outputTokens = 8000;
            assert.strictEqual(TokenManager.validateAllocation(inputTokens, outputTokens), true);
        });

        test('should return false when exceeding context limit', () => {
            const inputTokens = 400000;
            const outputTokens = 8000;
            assert.strictEqual(TokenManager.validateAllocation(inputTokens, outputTokens), false);
        });

        test('should include buffer for reasoning tokens', () => {
            // 390K input + 8K output + 10K buffer = 408K > 400K limit
            const inputTokens = 390000;
            const outputTokens = 8000;
            assert.strictEqual(TokenManager.validateAllocation(inputTokens, outputTokens), false);
        });

        test('should allow maximum valid allocation', () => {
            // 380K input + 8K output + 10K buffer = 398K < 400K limit
            const inputTokens = 380000;
            const outputTokens = 8000;
            assert.strictEqual(TokenManager.validateAllocation(inputTokens, outputTokens), true);
        });
    });

    suite('Constants', () => {
        test('MAX_INPUT_TOKENS should be 200K', () => {
            assert.strictEqual(TokenManager.MAX_INPUT_TOKENS, 200000);
        });

        test('CHARS_PER_TOKEN should be 4', () => {
            assert.strictEqual(TokenManager.CHARS_PER_TOKEN, 4);
        });

        test('CONTEXT_LIMIT should be 400K', () => {
            assert.strictEqual(TokenManager.CONTEXT_LIMIT, 400000);
        });

        test('REASONING_BUFFER should be 10K', () => {
            assert.strictEqual(TokenManager.REASONING_BUFFER, 10000);
        });
    });

    suite('Output Token Allocations', () => {
        test('COMMIT_MESSAGE should be 4000', () => {
            assert.strictEqual(TokenManager.OUTPUT_TOKENS.COMMIT_MESSAGE, 4000);
        });

        test('PR_TITLE should be 500', () => {
            assert.strictEqual(TokenManager.OUTPUT_TOKENS.PR_TITLE, 500);
        });

        test('PR_BODY should be 8000', () => {
            assert.strictEqual(TokenManager.OUTPUT_TOKENS.PR_BODY, 8000);
        });

        test('ISSUE should be 12000', () => {
            assert.strictEqual(TokenManager.OUTPUT_TOKENS.ISSUE, 12000);
        });
    });
});
