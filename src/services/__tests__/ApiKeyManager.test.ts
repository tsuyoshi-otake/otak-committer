/**
 * Unit tests for ApiKeyManager
 *
 * Tests specific scenarios and edge cases for:
 * - Input box configuration (password mode, placeholder, prompt)
 * - Format validation edge cases
 * - Existing key handling flows
 * - API validation flows
 */

import * as assert from 'assert';
import { ApiKeyManager } from '../ApiKeyManager';

suite('ApiKeyManager Unit Tests', () => {
    suite('Format Validation', () => {
        test('should accept valid API key format with minimum length', () => {
            // 40 characters after sk-
            const validKey = 'sk-' + 'a'.repeat(40);
            assert.strictEqual(ApiKeyManager.validateKeyFormat(validKey), true);
        });

        test('should accept valid API key format with longer length', () => {
            // 51 characters after sk- (typical OpenAI key length)
            const validKey = 'sk-' + 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLM';
            assert.strictEqual(ApiKeyManager.validateKeyFormat(validKey), true);
        });

        test('should accept valid API key with mixed case alphanumeric', () => {
            const validKey = 'sk-ABCDEFabcdef0123456789ABCDEFabcdef01234567';
            assert.strictEqual(ApiKeyManager.validateKeyFormat(validKey), true);
        });

        test('should reject empty string', () => {
            assert.strictEqual(ApiKeyManager.validateKeyFormat(''), false);
        });

        test('should reject null input', () => {
            assert.strictEqual(ApiKeyManager.validateKeyFormat(null as any), false);
        });

        test('should reject undefined input', () => {
            assert.strictEqual(ApiKeyManager.validateKeyFormat(undefined as any), false);
        });

        test('should reject whitespace-only string', () => {
            assert.strictEqual(ApiKeyManager.validateKeyFormat('   '), false);
            assert.strictEqual(ApiKeyManager.validateKeyFormat('\t'), false);
            assert.strictEqual(ApiKeyManager.validateKeyFormat('\n'), false);
        });

        test('should reject key without sk- prefix', () => {
            const invalidKey = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH';
            assert.strictEqual(ApiKeyManager.validateKeyFormat(invalidKey), false);
        });

        test('should reject key with wrong prefix', () => {
            assert.strictEqual(ApiKeyManager.validateKeyFormat('pk-' + 'a'.repeat(40)), false);
            assert.strictEqual(ApiKeyManager.validateKeyFormat('ak-' + 'a'.repeat(40)), false);
            assert.strictEqual(ApiKeyManager.validateKeyFormat('key-' + 'a'.repeat(40)), false);
        });

        test('should accept short keys (new permissive pattern)', () => {
            // Short keys (1-39 chars after sk-) should now be accepted
            const shortKey = 'sk-' + 'a'.repeat(5);
            assert.strictEqual(ApiKeyManager.validateKeyFormat(shortKey), true);

            // Minimum valid key: sk- + 1 character
            assert.strictEqual(ApiKeyManager.validateKeyFormat('sk-a'), true);
            assert.strictEqual(ApiKeyManager.validateKeyFormat('sk-1'), true);
        });

        test('should accept key with special characters (new permissive pattern)', () => {
            // Special characters after sk- should now be accepted
            const keyWithSpecial = 'sk-' + 'a'.repeat(20) + '!' + 'a'.repeat(20);
            assert.strictEqual(ApiKeyManager.validateKeyFormat(keyWithSpecial), true);
        });

        test('should accept key with spaces in middle (new permissive pattern)', () => {
            // Spaces in the middle of the key are now accepted
            const keyWithSpace = 'sk-' + 'a'.repeat(20) + ' ' + 'a'.repeat(20);
            assert.strictEqual(ApiKeyManager.validateKeyFormat(keyWithSpace), true);
        });

        test('should accept key with hyphen in suffix (new permissive pattern)', () => {
            // Hyphens after sk- prefix should now be accepted
            const keyWithHyphen = 'sk-' + 'a'.repeat(20) + '-' + 'a'.repeat(20);
            assert.strictEqual(ApiKeyManager.validateKeyFormat(keyWithHyphen), true);

            // Project-style keys
            assert.strictEqual(ApiKeyManager.validateKeyFormat('sk-proj-abc123'), true);
        });

        test('should accept key with underscore (new permissive pattern)', () => {
            // Underscores after sk- should now be accepted
            const keyWithUnderscore = 'sk-' + 'a'.repeat(20) + '_' + 'a'.repeat(20);
            assert.strictEqual(ApiKeyManager.validateKeyFormat(keyWithUnderscore), true);
        });

        test('should accept key with leading/trailing whitespace after trimming', () => {
            // Key with whitespace is trimmed before validation
            // After trimming, it's a valid sk-... key
            const validKey = '  sk-' + 'a'.repeat(40) + '  ';
            assert.strictEqual(ApiKeyManager.validateKeyFormat(validKey), true);

            // Short key with whitespace should also work
            assert.strictEqual(ApiKeyManager.validateKeyFormat('  sk-test  '), true);
        });

        test('should reject sk- prefix alone without characters after', () => {
            // sk- with nothing after should be rejected
            assert.strictEqual(ApiKeyManager.validateKeyFormat('sk-'), false);
            assert.strictEqual(ApiKeyManager.validateKeyFormat('  sk-  '), false);
        });
    });

    suite('Error Message Sanitization', () => {
        let apiKeyManager: ApiKeyManager;

        setup(() => {
            const mockContext = {} as any;
            const mockStorage = {} as any;
            apiKeyManager = new ApiKeyManager(mockContext, mockStorage);
        });

        test('should replace API key with [REDACTED] in error message', () => {
            const apiKey = 'sk-' + 'a'.repeat(40);
            const errorMessage = `Error: Invalid API key ${apiKey}`;
            const sanitized = apiKeyManager.sanitizeErrorMessage(errorMessage, apiKey);

            assert.ok(!sanitized.includes(apiKey));
            assert.ok(sanitized.includes('[REDACTED]'));
        });

        test('should handle multiple occurrences of API key', () => {
            const apiKey = 'sk-' + 'b'.repeat(40);
            const errorMessage = `Key ${apiKey} was rejected. Tried with ${apiKey}`;
            const sanitized = apiKeyManager.sanitizeErrorMessage(errorMessage, apiKey);

            assert.ok(!sanitized.includes(apiKey));
            // Count occurrences of [REDACTED]
            const redactedCount = (sanitized.match(/\[REDACTED\]/g) || []).length;
            assert.strictEqual(redactedCount, 2);
        });

        test('should return original message if API key not present', () => {
            const apiKey = 'sk-' + 'c'.repeat(40);
            const errorMessage = 'This is a safe error message';
            const sanitized = apiKeyManager.sanitizeErrorMessage(errorMessage, apiKey);

            assert.strictEqual(sanitized, errorMessage);
        });

        test('should handle empty error message', () => {
            const apiKey = 'sk-' + 'd'.repeat(40);
            const sanitized = apiKeyManager.sanitizeErrorMessage('', apiKey);

            assert.strictEqual(sanitized, '');
        });

        test('should handle empty API key', () => {
            const errorMessage = 'Some error message';
            const sanitized = apiKeyManager.sanitizeErrorMessage(errorMessage, '');

            assert.strictEqual(sanitized, errorMessage);
        });

        test('should handle null/undefined message', () => {
            const apiKey = 'sk-' + 'e'.repeat(40);

            assert.strictEqual(apiKeyManager.sanitizeErrorMessage(null as any, apiKey), '');
            assert.strictEqual(apiKeyManager.sanitizeErrorMessage(undefined as any, apiKey), '');
        });

        test('should escape special regex characters in API key', () => {
            // This shouldn't happen with valid API keys, but test defensive coding
            const mockContext = {} as any;
            const mockStorage = {} as any;
            const manager = new ApiKeyManager(mockContext, mockStorage);

            // Test with a key that has regex-special characters (hypothetical)
            const specialKey = 'sk-abc$def';
            const message = `Error with ${specialKey}`;
            // Should not throw and should handle gracefully
            const result = manager.sanitizeErrorMessage(message, specialKey);
            assert.ok(typeof result === 'string');
        });
    });

    suite('ApiKeyManager Instance', () => {
        test('should create instance with context and storage', () => {
            const mockContext = {} as any;
            const mockStorage = {} as any;
            const manager = new ApiKeyManager(mockContext, mockStorage);

            assert.ok(manager instanceof ApiKeyManager);
        });

        test('validateKeyFormat should be a static method', () => {
            assert.strictEqual(typeof ApiKeyManager.validateKeyFormat, 'function');
        });
    });
});
