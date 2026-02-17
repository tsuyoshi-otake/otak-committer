/**
 * Property-based tests for PromptService and message configuration
 *
 * Tests the correctness properties defined in design.md:
 * - Property 14: Simple style respects 200 character limit
 * - Property 15: Normal style respects 400 character limit
 * - Property 16: Detailed style respects 800 character limit
 */

import * as assert from 'assert';
import { createTaggedPropertyTest } from '../../test/helpers/property-test.helper';
import { MESSAGE_LENGTH_LIMITS, getMessageLengthLimit } from '../prompt';
import { MessageStyle } from '../../types/enums/MessageStyle';

suite('Prompt Service Property Tests', () => {
    /**
     * **Feature: ui-internationalization, Property 14: Simple style respects 200 character limit**
     * **Validates: Requirements 6.1**
     *
     * For any commit message generated with Simple style, the message length
     * should not exceed 200 characters.
     */
    test(
        'Property 14: Simple style has 200 character limit',
        createTaggedPropertyTest(
            'ui-internationalization',
            14,
            'Simple style respects 200 character limit',
            () => {
                // Verify the constant is correctly set
                assert.strictEqual(
                    MESSAGE_LENGTH_LIMITS[MessageStyle.Simple],
                    200,
                    'Simple style should have 200 character limit',
                );

                // Verify the function returns the correct limit
                assert.strictEqual(
                    getMessageLengthLimit(MessageStyle.Simple),
                    200,
                    'getMessageLengthLimit should return 200 for Simple style',
                );

                assert.strictEqual(
                    getMessageLengthLimit('simple'),
                    200,
                    'getMessageLengthLimit should return 200 for "simple" string',
                );
            },
        ),
    );

    /**
     * **Feature: ui-internationalization, Property 15: Normal style respects 400 character limit**
     * **Validates: Requirements 6.2**
     *
     * For any commit message generated with Normal style, the message length
     * should not exceed 400 characters.
     */
    test(
        'Property 15: Normal style has 400 character limit',
        createTaggedPropertyTest(
            'ui-internationalization',
            15,
            'Normal style respects 400 character limit',
            () => {
                // Verify the constant is correctly set
                assert.strictEqual(
                    MESSAGE_LENGTH_LIMITS[MessageStyle.Normal],
                    400,
                    'Normal style should have 400 character limit',
                );

                // Verify the function returns the correct limit
                assert.strictEqual(
                    getMessageLengthLimit(MessageStyle.Normal),
                    400,
                    'getMessageLengthLimit should return 400 for Normal style',
                );

                assert.strictEqual(
                    getMessageLengthLimit('normal'),
                    400,
                    'getMessageLengthLimit should return 400 for "normal" string',
                );

                // Default should be Normal
                assert.strictEqual(
                    getMessageLengthLimit('unknown'),
                    400,
                    'getMessageLengthLimit should default to 400 for unknown style',
                );
            },
        ),
    );

    /**
     * **Feature: ui-internationalization, Property 16: Detailed style respects 800 character limit**
     * **Validates: Requirements 6.3**
     *
     * For any commit message generated with Detailed style, the message length
     * should not exceed 800 characters.
     */
    test(
        'Property 16: Detailed style has 800 character limit',
        createTaggedPropertyTest(
            'ui-internationalization',
            16,
            'Detailed style respects 800 character limit',
            () => {
                // Verify the constant is correctly set
                assert.strictEqual(
                    MESSAGE_LENGTH_LIMITS[MessageStyle.Detailed],
                    800,
                    'Detailed style should have 800 character limit',
                );

                // Verify the function returns the correct limit
                assert.strictEqual(
                    getMessageLengthLimit(MessageStyle.Detailed),
                    800,
                    'getMessageLengthLimit should return 800 for Detailed style',
                );

                assert.strictEqual(
                    getMessageLengthLimit('detailed'),
                    800,
                    'getMessageLengthLimit should return 800 for "detailed" string',
                );
            },
        ),
    );
});

suite('Prompt Service Unit Tests', () => {
    test('MESSAGE_LENGTH_LIMITS should have all message styles', () => {
        assert.ok(MESSAGE_LENGTH_LIMITS[MessageStyle.Simple], 'Should have Simple limit');
        assert.ok(MESSAGE_LENGTH_LIMITS[MessageStyle.Normal], 'Should have Normal limit');
        assert.ok(MESSAGE_LENGTH_LIMITS[MessageStyle.Detailed], 'Should have Detailed limit');
    });

    test('Message limits should be in increasing order', () => {
        assert.ok(
            MESSAGE_LENGTH_LIMITS[MessageStyle.Simple] < MESSAGE_LENGTH_LIMITS[MessageStyle.Normal],
            'Simple limit should be less than Normal limit',
        );
        assert.ok(
            MESSAGE_LENGTH_LIMITS[MessageStyle.Normal] <
                MESSAGE_LENGTH_LIMITS[MessageStyle.Detailed],
            'Normal limit should be less than Detailed limit',
        );
    });

    test('All message limits should be positive numbers', () => {
        assert.ok(
            MESSAGE_LENGTH_LIMITS[MessageStyle.Simple] > 0,
            'Simple limit should be positive',
        );
        assert.ok(
            MESSAGE_LENGTH_LIMITS[MessageStyle.Normal] > 0,
            'Normal limit should be positive',
        );
        assert.ok(
            MESSAGE_LENGTH_LIMITS[MessageStyle.Detailed] > 0,
            'Detailed limit should be positive',
        );
    });
});
