/**
 * Test configuration for the extension
 * Defines settings for both unit tests and property-based tests
 */

export const TEST_CONFIG = {
    /**
     * Property-based testing configuration
     */
    propertyBased: {
        /**
         * Number of iterations for each property test
         * Minimum 100 as per design requirements
         */
        numRuns: 100,

        /**
         * Timeout for property tests (ms)
         */
        timeout: 10000,

        /**
         * Verbose output for debugging
         */
        verbose: false,
    },

    /**
     * Unit test configuration
     */
    unit: {
        /**
         * Timeout for unit tests (ms)
         */
        timeout: 5000,
    },

    /**
     * Integration test configuration
     */
    integration: {
        /**
         * Timeout for integration tests (ms)
         */
        timeout: 15000,
    },
};
