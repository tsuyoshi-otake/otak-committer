/**
 * Helper utilities for property-based testing with fast-check
 * Provides common patterns and configurations for PBT
 */

import * as fc from 'fast-check';
import { TEST_CONFIG } from '../test.config';

/**
 * Default parameters for property-based tests
 * Ensures all tests run with at least 100 iterations as per requirements
 */
export const defaultPropertyTestParams: fc.Parameters<unknown> = {
    numRuns: TEST_CONFIG.propertyBased.numRuns,
    verbose: TEST_CONFIG.propertyBased.verbose,
};

/**
 * Runs a property-based test with default configuration
 *
 * @param property - The property to test
 * @param params - Optional parameters to override defaults
 *
 * @example
 * ```typescript
 * runPropertyTest(
 *   fc.property(fc.string(), (str) => {
 *     return str.length >= 0;
 *   })
 * );
 * ```
 */
export function runPropertyTest(
    property: fc.IProperty<unknown> | fc.IAsyncProperty<unknown>,
    params?: Partial<fc.Parameters<unknown>>,
): void {
    fc.assert(property, { ...defaultPropertyTestParams, ...params });
}

/**
 * Creates a property test with a descriptive tag
 * Tags follow the format: **Feature: {feature_name}, Property {number}: {property_text}**
 *
 * @param featureName - Name of the feature being tested
 * @param propertyNumber - Property number from design document
 * @param propertyDescription - Brief description of the property
 * @param testFn - The test function
 *
 * @example
 * ```typescript
 * createTaggedPropertyTest(
 *   'extension-architecture-refactoring',
 *   1,
 *   'No Circular Dependencies',
 *   () => {
 *     // test implementation
 *   }
 * );
 * ```
 */
export function createTaggedPropertyTest(
    featureName: string,
    propertyNumber: number,
    propertyDescription: string,
    testFn: () => void,
): () => void {
    return function taggedTest() {
        // Add property tag as comment in test output
        console.log(
            `\n**Feature: ${featureName}, Property ${propertyNumber}: ${propertyDescription}**\n`,
        );
        testFn();
    };
}

/**
 * Common arbitraries for VS Code extension testing
 */
export const arbitraries = {
    /**
     * Generates valid configuration keys
     */
    configKey: () =>
        fc.constantFrom('language', 'messageStyle', 'useEmoji', 'emojiStyle', 'customMessage'),

    /**
     * Generates valid language codes
     */
    language: () =>
        fc.constantFrom('english', 'japanese', 'chinese', 'spanish', 'french', 'german'),

    /**
     * Generates valid message styles
     */
    messageStyle: () => fc.constantFrom('simple', 'normal', 'detailed'),

    /**
     * Generates valid emoji styles
     */
    emojiStyle: () => fc.constantFrom('github', 'unicode'),

    /**
     * Generates valid API key formats (mock)
     */
    apiKey: () =>
        fc
            .string({ minLength: 20, maxLength: 100 })
            .filter((s) => s.startsWith('sk-') || s.startsWith('ghp_')),

    /**
     * Generates non-empty strings
     */
    nonEmptyString: () => fc.string({ minLength: 1 }),

    /**
     * Generates file paths
     */
    filePath: () =>
        fc
            .array(
                fc
                    .string({ minLength: 1, maxLength: 20 })
                    .filter((s) => !s.includes('/') && !s.includes('\\')),
                { minLength: 1, maxLength: 5 },
            )
            .map((parts) => parts.join('/')),
};
