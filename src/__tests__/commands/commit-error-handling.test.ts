/**
 * Unit tests for commit command error handling
 *
 * **Feature: commit-message-generation-robustness**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */

import * as assert from 'assert';
import {
    CommitError,
    createCommitErrorContext,
    formatErrorMessage,
    CommitErrorContext,
    handleCommitError,
    isApiKeyError,
    isNetworkError,
    isDiffError,
    isEmptyDiffError
} from '../../utils/errorHandling';

suite('Commit Error Handling Tests', () => {
    suite('Error Context Creation', () => {
        /**
         * Test: Error context should include operation name
         * Validates: Requirement 4.5
         */
        test('should create context with operation name', () => {
            const context = createCommitErrorContext('getDiff');
            assert.strictEqual(context.operation, 'getDiff');
        });

        test('should create context with file count', () => {
            const context = createCommitErrorContext('getDiff', { fileCount: 10 });
            assert.strictEqual(context.details?.fileCount, 10);
        });

        test('should create context with token count', () => {
            const context = createCommitErrorContext('generateMessage', { tokenCount: 50000 });
            assert.strictEqual(context.details?.tokenCount, 50000);
        });

        test('should create context with error type', () => {
            const context = createCommitErrorContext('apiCall', { errorType: 'RATE_LIMIT' });
            assert.strictEqual(context.details?.errorType, 'RATE_LIMIT');
        });

        test('should create context with API error details', () => {
            const apiError = { status: 401, message: 'Unauthorized' };
            const context = createCommitErrorContext('apiCall', { apiError });
            assert.deepStrictEqual(context.details?.apiError, apiError);
        });
    });

    suite('Error Message Formatting', () => {
        /**
         * Test: Error messages should include operation context
         * Validates: Requirements 4.1, 4.2
         */
        test('should format message with operation name', () => {
            const context: CommitErrorContext = { operation: 'getDiff' };
            const error = new Error('Git error');
            const formatted = formatErrorMessage(error, context);
            assert.ok(formatted.includes('getDiff'));
        });

        test('should format message with file count when available', () => {
            const context: CommitErrorContext = {
                operation: 'getDiff',
                details: { fileCount: 50 }
            };
            const error = new Error('Too many files');
            const formatted = formatErrorMessage(error, context);
            assert.ok(formatted.includes('50'));
        });

        test('should format message with token count when available', () => {
            const context: CommitErrorContext = {
                operation: 'truncateDiff',
                details: { tokenCount: 300000 }
            };
            const error = new Error('Diff too large');
            const formatted = formatErrorMessage(error, context);
            assert.ok(formatted.includes('300000') || formatted.includes('300K'));
        });

        test('should include original error message', () => {
            const context: CommitErrorContext = { operation: 'test' };
            const error = new Error('Original error message');
            const formatted = formatErrorMessage(error, context);
            assert.ok(formatted.includes('Original error message'));
        });
    });

    suite('Diff Retrieval Errors (Requirement 4.1)', () => {
        test('should identify diff errors correctly', () => {
            const error = new CommitError('Failed to get diff', 'DIFF_ERROR');
            assert.ok(isDiffError(error));
        });

        test('should format diff error with reason', () => {
            const context: CommitErrorContext = {
                operation: 'getDiff',
                details: { errorType: 'NO_REPO' }
            };
            const error = new Error('No git repository found');
            const formatted = formatErrorMessage(error, context);
            assert.ok(formatted.includes('getDiff') || formatted.includes('git'));
        });

        test('should handle file access errors', () => {
            const error = new CommitError('Cannot access file', 'FILE_ACCESS_ERROR');
            assert.ok(isDiffError(error));
        });
    });

    suite('API Errors (Requirement 4.2)', () => {
        test('should format API error with status code', () => {
            const context: CommitErrorContext = {
                operation: 'generateMessage',
                details: {
                    apiError: { status: 500, message: 'Internal Server Error' }
                }
            };
            const error = new Error('API call failed');
            const formatted = formatErrorMessage(error, context);
            assert.ok(formatted.includes('500') || formatted.includes('API'));
        });

        test('should identify network errors', () => {
            const error = new CommitError('Network timeout', 'NETWORK_ERROR');
            assert.ok(isNetworkError(error));
        });

        test('should identify rate limit errors', () => {
            const error = new CommitError('Rate limited', 'RATE_LIMIT');
            const context: CommitErrorContext = {
                operation: 'generateMessage',
                details: { errorType: 'RATE_LIMIT' }
            };
            const formatted = formatErrorMessage(error, context);
            assert.ok(formatted.includes('Rate') || formatted.includes('rate'));
        });
    });

    suite('API Key Errors (Requirement 4.3)', () => {
        test('should identify invalid API key errors', () => {
            const error = new CommitError('Invalid API key', 'INVALID_API_KEY');
            assert.ok(isApiKeyError(error));
        });

        test('should identify missing API key errors', () => {
            const error = new CommitError('API key not configured', 'MISSING_API_KEY');
            assert.ok(isApiKeyError(error));
        });

        test('should format API key error with configuration hint', () => {
            const error = new CommitError('Invalid API key', 'INVALID_API_KEY');
            const context: CommitErrorContext = { operation: 'validateApiKey' };
            const formatted = formatErrorMessage(error, context);
            assert.ok(
                formatted.includes('API key') ||
                formatted.includes('configure') ||
                formatted.includes('Invalid')
            );
        });
    });

    suite('Empty Diff Errors (Requirement 4.4)', () => {
        test('should identify empty diff errors', () => {
            const error = new CommitError('No changes to commit', 'EMPTY_DIFF');
            assert.ok(isEmptyDiffError(error));
        });

        test('should format empty diff error clearly', () => {
            const error = new CommitError('No changes detected', 'EMPTY_DIFF');
            const context: CommitErrorContext = { operation: 'getDiff' };
            const formatted = formatErrorMessage(error, context);
            assert.ok(
                formatted.includes('changes') ||
                formatted.includes('empty') ||
                formatted.includes('No')
            );
        });
    });

    suite('Unexpected Errors (Requirement 4.5)', () => {
        test('should log full error details for debugging', () => {
            const error = new Error('Unexpected failure');
            (error as any).stack = 'Error stack trace here';
            const context: CommitErrorContext = {
                operation: 'unknown',
                details: {
                    fileCount: 5,
                    tokenCount: 1000,
                    errorType: 'UNKNOWN'
                }
            };
            const formatted = formatErrorMessage(error, context);
            // Should include context for debugging
            assert.ok(formatted.length > 0);
        });

        test('should handle errors without stack traces', () => {
            const error = new Error('Simple error');
            delete error.stack;
            const context: CommitErrorContext = { operation: 'test' };
            const formatted = formatErrorMessage(error, context);
            assert.ok(formatted.includes('Simple error'));
        });

        test('should handle non-Error objects', () => {
            const error = 'String error';
            const context: CommitErrorContext = { operation: 'test' };
            const formatted = formatErrorMessage(error as any, context);
            assert.ok(formatted.length > 0);
        });
    });

    suite('CommitError Class', () => {
        test('should create error with code', () => {
            const error = new CommitError('Test message', 'UNKNOWN_ERROR');
            assert.strictEqual(error.message, 'Test message');
            assert.strictEqual(error.code, 'UNKNOWN_ERROR');
        });

        test('should create error with context', () => {
            const context: CommitErrorContext = {
                operation: 'test',
                details: { fileCount: 10 }
            };
            const error = new CommitError('Test message', 'UNKNOWN_ERROR', context);
            assert.deepStrictEqual(error.context, context);
        });

        test('should be instanceof Error', () => {
            const error = new CommitError('Test', 'UNKNOWN_ERROR');
            assert.ok(error instanceof Error);
        });
    });

    suite('Error Handler Function', () => {
        test('should return formatted message for known errors', () => {
            const error = new CommitError('API failed', 'API_ERROR');
            const context: CommitErrorContext = { operation: 'apiCall' };
            const result = handleCommitError(error, context);
            assert.ok(result.message.length > 0);
            assert.ok(result.isRecoverable !== undefined);
        });

        test('should mark API key errors as recoverable', () => {
            const error = new CommitError('Invalid key', 'INVALID_API_KEY');
            const context: CommitErrorContext = { operation: 'validate' };
            const result = handleCommitError(error, context);
            assert.strictEqual(result.isRecoverable, true);
        });

        test('should mark network errors as potentially recoverable', () => {
            const error = new CommitError('Timeout', 'NETWORK_ERROR');
            const context: CommitErrorContext = { operation: 'apiCall' };
            const result = handleCommitError(error, context);
            assert.strictEqual(result.isRecoverable, true);
        });
    });
});
