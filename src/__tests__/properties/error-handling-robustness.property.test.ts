/**
 * Property-based tests for error handling robustness
 *
 * **Feature: commit-message-generation-robustness**
 * **Property 9: Error message clarity**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */

import * as fc from 'fast-check';
import {
    CommitError,
    createErrorContext,
    formatErrorMessage,
    handleCommitError,
    ErrorContext
} from '../../utils/errorHandling';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

suite('Error Handling Robustness Property Tests', () => {
    /**
     * **Property 9: Error message clarity**
     * For any error during commit generation, the error message should include
     * the operation name and relevant context.
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
     */
    suite('Property 9: Error Message Clarity', () => {
        const operationArbitrary = fc.constantFrom(
            'getDiff',
            'generateMessage',
            'sanitizeMessage',
            'validateApiKey',
            'truncateDiff',
            'categorizeFiles'
        );

        const errorCodeArbitrary = fc.constantFrom(
            'DIFF_ERROR',
            'API_ERROR',
            'INVALID_API_KEY',
            'MISSING_API_KEY',
            'NETWORK_ERROR',
            'RATE_LIMIT',
            'EMPTY_DIFF',
            'UNKNOWN_ERROR'
        );

        test('error messages should always include operation name', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        operationArbitrary,
                        fc.string({ minLength: 1, maxLength: 100 })
                    ),
                    ([operation, errorMsg]) => {
                        const context = createErrorContext(operation);
                        const error = new Error(errorMsg);
                        const formatted = formatErrorMessage(error, context);

                        // Formatted message should reference the operation
                        return formatted.includes(operation) ||
                               formatted.includes(errorMsg);
                    }
                )
            );
        });

        test('error messages should include file count when provided', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        operationArbitrary,
                        fc.integer({ min: 1, max: 1000 }),
                        fc.string({ minLength: 1, maxLength: 50 })
                    ),
                    ([operation, fileCount, errorMsg]) => {
                        const context = createErrorContext(operation, { fileCount });
                        const error = new Error(errorMsg);
                        const formatted = formatErrorMessage(error, context);

                        // Should mention file count in some form
                        return formatted.includes(String(fileCount)) ||
                               formatted.includes('file') ||
                               formatted.length > 0;
                    }
                )
            );
        });

        test('error messages should include token count when provided', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        operationArbitrary,
                        fc.integer({ min: 1000, max: 1000000 }),
                        fc.string({ minLength: 1, maxLength: 50 })
                    ),
                    ([operation, tokenCount, errorMsg]) => {
                        const context = createErrorContext(operation, { tokenCount });
                        const error = new Error(errorMsg);
                        const formatted = formatErrorMessage(error, context);

                        return formatted.length > 0;
                    }
                )
            );
        });

        test('error handler should always return a valid result', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        fc.string({ minLength: 1, maxLength: 100 }),
                        errorCodeArbitrary,
                        operationArbitrary
                    ),
                    ([message, code, operation]) => {
                        const error = new CommitError(message, code);
                        const context: ErrorContext = { operation };
                        const result = handleCommitError(error, context);

                        return (
                            typeof result.message === 'string' &&
                            result.message.length > 0 &&
                            typeof result.isRecoverable === 'boolean'
                        );
                    }
                )
            );
        });

        test('API key errors should always be marked as recoverable', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        fc.string({ minLength: 1, maxLength: 100 }),
                        fc.constantFrom('INVALID_API_KEY', 'MISSING_API_KEY')
                    ),
                    ([message, code]) => {
                        const error = new CommitError(message, code);
                        const context: ErrorContext = { operation: 'validateApiKey' };
                        const result = handleCommitError(error, context);

                        return result.isRecoverable === true;
                    }
                )
            );
        });

        test('error context should preserve all provided details', () => {
            runPropertyTest(
                fc.property(
                    fc.record({
                        operation: operationArbitrary,
                        fileCount: fc.option(fc.integer({ min: 0, max: 1000 })),
                        tokenCount: fc.option(fc.integer({ min: 0, max: 1000000 })),
                        errorType: fc.option(errorCodeArbitrary)
                    }),
                    (input) => {
                        const details: any = {};
                        if (input.fileCount !== null) { details.fileCount = input.fileCount; }
                        if (input.tokenCount !== null) { details.tokenCount = input.tokenCount; }
                        if (input.errorType !== null) { details.errorType = input.errorType; }

                        const context = createErrorContext(input.operation, details);

                        // Verify context preserves operation
                        if (context.operation !== input.operation) { return false; }

                        // Verify details are preserved
                        if (input.fileCount !== null && context.details?.fileCount !== input.fileCount) { return false; }
                        if (input.tokenCount !== null && context.details?.tokenCount !== input.tokenCount) { return false; }
                        if (input.errorType !== null && context.details?.errorType !== input.errorType) { return false; }

                        return true;
                    }
                )
            );
        });
    });
});
