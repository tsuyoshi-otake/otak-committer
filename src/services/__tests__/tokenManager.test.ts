/**
 * TokenManager Unit Tests
 * Tests for token estimation, truncation, and validation
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
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
            const inputTokens = 1050000;
            const outputTokens = 8000;
            assert.strictEqual(TokenManager.validateAllocation(inputTokens, outputTokens), false);
        });

        test('should include buffer for reasoning tokens', () => {
            // 1,040K input + 8K output + 10K buffer = 1,058K > 1,050K limit
            const inputTokens = 1040000;
            const outputTokens = 8000;
            assert.strictEqual(TokenManager.validateAllocation(inputTokens, outputTokens), false);
        });

        test('should allow maximum valid allocation', () => {
            // 1,030K input + 8K output + 10K buffer = 1,048K < 1,050K limit
            const inputTokens = 1030000;
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

        test('CONTEXT_LIMIT should be the gpt-6-luna context window (1,050K)', () => {
            assert.strictEqual(TokenManager.CONTEXT_LIMIT, 1050000);
        });

        test('MODEL_MAX_INPUT_TOKENS should be the gpt-6-luna max input (922K)', () => {
            assert.strictEqual(TokenManager.MODEL_MAX_INPUT_TOKENS, 922000);
        });

        test('REASONING_BUFFER should be 10K', () => {
            assert.strictEqual(TokenManager.REASONING_BUFFER, 10000);
        });
    });

    suite('Output Token Allocations', () => {
        test('COMMIT_MESSAGE should be 5000', () => {
            assert.strictEqual(TokenManager.OUTPUT_TOKENS.COMMIT_MESSAGE, 5000);
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

    suite('resolveConfiguredMaxTokens', () => {
        test('accepts budgets above the former 400K cap up to the model max input', () => {
            assert.strictEqual(TokenManager.resolveConfiguredMaxTokens(600000), 600000);
            assert.strictEqual(TokenManager.resolveConfiguredMaxTokens(922000), 922000);
        });

        test('clamps settings.json values above the model max input', () => {
            assert.strictEqual(TokenManager.resolveConfiguredMaxTokens(2000000), 922000);
        });

        test('falls back to MAX_INPUT_TOKENS for missing, invalid, or too-small values', () => {
            for (const value of [undefined, '300000', Number.NaN, Infinity, 999, -1]) {
                assert.strictEqual(
                    TokenManager.resolveConfiguredMaxTokens(value),
                    TokenManager.MAX_INPUT_TOKENS,
                    String(value),
                );
            }
        });

        test('manifest bounds match the model limits', () => {
            const manifest = JSON.parse(
                fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'),
            );
            const setting = manifest.contributes.configuration.properties['otakCommitter.maxInputTokens'];
            assert.strictEqual(setting.default, TokenManager.MAX_INPUT_TOKENS);
            assert.strictEqual(setting.minimum, 1000);
            assert.strictEqual(setting.maximum, TokenManager.MODEL_MAX_INPUT_TOKENS);
        });
    });
});
