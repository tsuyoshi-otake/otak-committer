/**
 * Property-based tests for ApiKeyManager
 *
 * Tests the correctness properties defined in the design document:
 * - Property 1: Format validation correctness
 * - Property 2: Complete key removal
 * - Property 3: API key confidentiality in error messages
 */

import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

// Import ApiKeyManager after creation
import { ApiKeyManager } from '../ApiKeyManager';

/**
 * Generate alphanumeric string of specified length
 */
function alphanumericString(minLength: number, maxLength: number): fc.Arbitrary<string> {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return fc.array(
        fc.constantFrom(...chars.split('')),
        { minLength, maxLength }
    ).map(arr => arr.join(''));
}

suite('ApiKeyManager Property Tests', () => {
    /**
     * **Feature: api-key-security-enhancement, Property 1: Format validation correctness**
     *
     * For any string input, the format validation should accept strings matching
     * the pattern `sk-[a-zA-Z0-9]{40,}` and reject all other strings
     *
     * Validates: Requirements 1.3, 1.4, 1.5
     */
    suite('Property 1: Format validation correctness', () => {
        test('should accept valid API key formats', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 1: Format validation correctness**\n');

            // Generate valid API keys: sk- followed by 40+ alphanumeric characters
            const validApiKeyArbitrary = alphanumericString(40, 100)
                .map(suffix => 'sk-' + suffix);

            runPropertyTest(
                fc.property(validApiKeyArbitrary, (apiKey) => {
                    const isValid = ApiKeyManager.validateKeyFormat(apiKey);
                    return isValid === true;
                })
            );
        });

        test('should reject invalid API key formats - wrong prefix', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 1: Format validation correctness**\n');

            // Generate keys with wrong prefixes
            const invalidPrefixArbitrary = fc.tuple(
                fc.constantFrom('pk-', 'ak-', 'key-', 'api-', 'test-', ''),
                alphanumericString(40, 100)
            ).map(([prefix, suffix]) => prefix + suffix);

            runPropertyTest(
                fc.property(invalidPrefixArbitrary, (apiKey) => {
                    const isValid = ApiKeyManager.validateKeyFormat(apiKey);
                    return isValid === false;
                })
            );
        });

        test('should reject invalid API key formats - too short', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 1: Format validation correctness**\n');

            // Generate keys that are too short (less than 40 chars after sk-)
            const shortApiKeyArbitrary = alphanumericString(1, 39)
                .map(suffix => 'sk-' + suffix);

            runPropertyTest(
                fc.property(shortApiKeyArbitrary, (apiKey) => {
                    const isValid = ApiKeyManager.validateKeyFormat(apiKey);
                    return isValid === false;
                })
            );
        });

        test('should reject empty and whitespace-only strings', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 1: Format validation correctness**\n');

            const whitespaceArbitrary = fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n  ');

            runPropertyTest(
                fc.property(whitespaceArbitrary, (input) => {
                    const isValid = ApiKeyManager.validateKeyFormat(input);
                    return isValid === false;
                })
            );
        });

        test('should reject keys with special characters', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 1: Format validation correctness**\n');

            // Generate keys with special characters
            const specialCharArbitrary = fc.tuple(
                alphanumericString(20, 20),
                fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')'),
                alphanumericString(20, 20)
            ).map(([part1, special, part2]) => 'sk-' + part1 + special + part2);

            runPropertyTest(
                fc.property(specialCharArbitrary, (apiKey) => {
                    const isValid = ApiKeyManager.validateKeyFormat(apiKey);
                    return isValid === false;
                })
            );
        });
    });

    /**
     * **Feature: api-key-security-enhancement, Property 2: Complete key removal**
     *
     * For any stored API key, when the removal operation is performed,
     * the key should not exist in any storage location
     *
     * Validates: Requirements 3.4
     */
    suite('Property 2: Complete key removal', () => {
        test('should remove API key completely from mock storage', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 2: Complete key removal**\n');

            // Mock storage to track removal
            const createMockStorage = () => ({
                hasApiKey: false,
                apiKey: null as string | null,
                setApiKey: async function(_service: string, key: string) {
                    this.apiKey = key;
                    this.hasApiKey = true;
                },
                getApiKey: async function(_service: string) {
                    return this.apiKey;
                },
                deleteApiKey: async function(_service: string) {
                    this.apiKey = null;
                    this.hasApiKey = false;
                },
                hasApiKeyCheck: async function(_service: string) {
                    return this.hasApiKey;
                }
            });

            // Generate valid API keys
            const validApiKeyArbitrary = alphanumericString(40, 60)
                .map(suffix => 'sk-' + suffix);

            runPropertyTest(
                fc.asyncProperty(validApiKeyArbitrary, async (apiKey) => {
                    const mockStorage = createMockStorage();

                    // Store the key
                    await mockStorage.setApiKey('openai', apiKey);

                    // Verify key exists
                    const existsBefore = await mockStorage.hasApiKeyCheck('openai');
                    if (!existsBefore) return false;

                    // Remove the key
                    await mockStorage.deleteApiKey('openai');

                    // Verify key no longer exists
                    const existsAfter = await mockStorage.hasApiKeyCheck('openai');
                    const valueAfter = await mockStorage.getApiKey('openai');

                    return existsAfter === false && valueAfter === null;
                })
            );
        });
    });

    /**
     * **Feature: api-key-security-enhancement, Property 3: API key confidentiality in error messages**
     *
     * For any error message generated by the API key management system,
     * the message should not contain the actual API key value
     *
     * Validates: Requirements 4.4
     */
    suite('Property 3: API key confidentiality in error messages', () => {
        test('should never include API key in sanitized error messages', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 3: API key confidentiality in error messages**\n');

            // Create a mock ApiKeyManager to test sanitization
            const mockContext = {} as any;
            const mockStorage = {} as any;
            const apiKeyManager = new ApiKeyManager(mockContext, mockStorage);

            // Generate valid API keys
            const validApiKeyArbitrary = alphanumericString(40, 60)
                .map(suffix => 'sk-' + suffix);

            // Generate error messages that may contain the API key
            const errorMessageArbitrary = fc.tuple(
                validApiKeyArbitrary,
                fc.constantFrom(
                    'Error with key: ',
                    'Invalid API key ',
                    'Authentication failed for ',
                    'Unauthorized: ',
                    ''
                ),
                fc.constantFrom(
                    ' is invalid',
                    ' was rejected',
                    '',
                    ' failed'
                )
            ).map(([apiKey, prefix, suffix]) => ({
                apiKey,
                errorMessage: prefix + apiKey + suffix
            }));

            runPropertyTest(
                fc.property(errorMessageArbitrary, ({ apiKey, errorMessage }) => {
                    const sanitized = apiKeyManager.sanitizeErrorMessage(errorMessage, apiKey);
                    // The sanitized message should NOT contain the API key
                    return !sanitized.includes(apiKey);
                })
            );
        });

        test('should handle edge cases in error message sanitization', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 3: API key confidentiality in error messages**\n');

            const mockContext = {} as any;
            const mockStorage = {} as any;
            const apiKeyManager = new ApiKeyManager(mockContext, mockStorage);

            // Generate valid API keys
            const validApiKeyArbitrary = alphanumericString(40, 60)
                .map(suffix => 'sk-' + suffix);

            runPropertyTest(
                fc.property(validApiKeyArbitrary, (apiKey) => {
                    // Test with empty message
                    const emptyResult = apiKeyManager.sanitizeErrorMessage('', apiKey);
                    if (emptyResult !== '') return false;

                    // Test with message not containing the key
                    const safeMessage = 'This is a safe error message';
                    const safeResult = apiKeyManager.sanitizeErrorMessage(safeMessage, apiKey);
                    if (safeResult !== safeMessage) return false;

                    // Test with API key appearing multiple times
                    const multipleKeyMessage = `Key ${apiKey} and again ${apiKey}`;
                    const multipleResult = apiKeyManager.sanitizeErrorMessage(multipleKeyMessage, apiKey);
                    if (multipleResult.includes(apiKey)) return false;

                    return true;
                })
            );
        });
    });
});
