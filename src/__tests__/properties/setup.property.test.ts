/**
 * Setup verification test for property-based testing infrastructure
 * This test verifies that fast-check is properly configured
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import { runPropertyTest, arbitraries } from '../../test/helpers/property-test.helper';

suite('Property-Based Testing Setup', () => {
    test('fast-check should be properly configured', () => {
        // Simple property: string length is always non-negative
        runPropertyTest(
            fc.property(fc.string(), (str) => {
                return str.length >= 0;
            }),
        );
    });

    test('custom arbitraries should work correctly', () => {
        // Test that our custom arbitraries generate valid values
        runPropertyTest(
            fc.property(arbitraries.messageStyle(), (style) => {
                return ['simple', 'normal', 'detailed'].includes(style);
            }),
        );
    });

    test('property tests should run 100 iterations by default', () => {
        let runCount = 0;

        runPropertyTest(
            fc.property(fc.integer(), (_num) => {
                runCount++;
                return true;
            }),
        );

        // Verify that the test ran at least 100 times
        assert.ok(runCount >= 100, `Expected at least 100 runs, got ${runCount}`);
    });
});
