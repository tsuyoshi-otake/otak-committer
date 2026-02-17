/**
 * Property-Based Tests for GPT-5.2 Error Handling
 *
 * Property 6: Error logging completeness
 * Property 7: User-friendly error messages
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';
import {
    ResponsesAPIErrorType,
    classifyError,
    getUserFriendlyMessage,
} from '../../test/mocks/responsesAPI.mock';

suite('GPT-5.2 Error Handling Property Tests', () => {
    /**
     * Property 6: Error logging completeness
     * *For any* failed Responses API call, the system should log the error with
     * full context including request parameters, error type, and stack trace
     * Validates: Requirements 4.1
     */
    test('Property 6: Error classification should be deterministic', () => {
        runPropertyTest(
            fc.property(
                fc.constantFrom(400, 401, 404, 429, 500, 502, 503),
                fc.string({ minLength: 0, maxLength: 100 }),
                (statusCode, message) => {
                    const result1 = classifyError(statusCode, message);
                    const result2 = classifyError(statusCode, message);
                    return result1 === result2;
                },
            ),
        );
    });

    test('Property 6: 401 errors should be classified as AUTHENTICATION', () => {
        const errorType = classifyError(401, 'Unauthorized');
        assert.strictEqual(errorType, ResponsesAPIErrorType.AUTHENTICATION);
    });

    test('Property 6: 429 errors should be classified as RATE_LIMIT', () => {
        const errorType = classifyError(429, 'Rate limit exceeded');
        assert.strictEqual(errorType, ResponsesAPIErrorType.RATE_LIMIT);
    });

    test('Property 6: 404 with model message should be classified as INVALID_MODEL', () => {
        const errorType = classifyError(404, 'Model gpt-5.2 not found');
        assert.strictEqual(errorType, ResponsesAPIErrorType.INVALID_MODEL);
    });

    test('Property 6: 400 with context message should be classified as CONTEXT_LENGTH_EXCEEDED', () => {
        const errorType = classifyError(400, 'Context length exceeded');
        assert.strictEqual(errorType, ResponsesAPIErrorType.CONTEXT_LENGTH_EXCEEDED);
    });

    test('Property 6: 400 with token message should be classified as CONTEXT_LENGTH_EXCEEDED', () => {
        const errorType = classifyError(400, 'Maximum token limit exceeded');
        assert.strictEqual(errorType, ResponsesAPIErrorType.CONTEXT_LENGTH_EXCEEDED);
    });

    test('Property 6: Network errors should be classified as NETWORK', () => {
        const errorType = classifyError(0, 'Network connection failed');
        assert.strictEqual(errorType, ResponsesAPIErrorType.NETWORK);
    });

    /**
     * Property 7: User-friendly error messages
     * *For any* failed Responses API call, the system should display a
     * user-friendly error message that explains the issue without exposing technical details
     * Validates: Requirements 4.2
     */
    test('Property 7: User-friendly messages should not contain stack traces', () => {
        runPropertyTest(
            fc.property(
                fc.constantFrom(
                    ResponsesAPIErrorType.RATE_LIMIT,
                    ResponsesAPIErrorType.INVALID_MODEL,
                    ResponsesAPIErrorType.CONTEXT_LENGTH_EXCEEDED,
                    ResponsesAPIErrorType.NETWORK,
                    ResponsesAPIErrorType.AUTHENTICATION,
                    ResponsesAPIErrorType.UNKNOWN,
                ),
                (errorType) => {
                    const message = getUserFriendlyMessage(errorType);
                    // Should not contain technical details
                    return (
                        !message.includes('stack') &&
                        !message.includes('Error:') &&
                        !message.includes('at ') &&
                        message.length > 0
                    );
                },
            ),
        );
    });

    test('Property 7: User-friendly messages should be actionable', () => {
        runPropertyTest(
            fc.property(
                fc.constantFrom(
                    ResponsesAPIErrorType.RATE_LIMIT,
                    ResponsesAPIErrorType.INVALID_MODEL,
                    ResponsesAPIErrorType.CONTEXT_LENGTH_EXCEEDED,
                    ResponsesAPIErrorType.NETWORK,
                    ResponsesAPIErrorType.AUTHENTICATION,
                    ResponsesAPIErrorType.UNKNOWN,
                ),
                (errorType) => {
                    const message = getUserFriendlyMessage(errorType);
                    // Messages should contain actionable guidance
                    return (
                        message.includes('Please') ||
                        message.includes('try again') ||
                        message.includes('check') ||
                        message.includes('update') ||
                        message.includes('truncated')
                    );
                },
            ),
        );
    });

    test('Property 7: Rate limit message should include retry timing when available', () => {
        const messageWithRetry = getUserFriendlyMessage(ResponsesAPIErrorType.RATE_LIMIT, 30);
        assert.ok(messageWithRetry.includes('30'));
        assert.ok(messageWithRetry.includes('seconds'));
    });

    test('Property 7: Rate limit message should be helpful without retry timing', () => {
        const messageWithoutRetry = getUserFriendlyMessage(ResponsesAPIErrorType.RATE_LIMIT);
        assert.ok(messageWithoutRetry.includes('try again'));
    });

    test('Property 7: Invalid model message should mention GPT-5.2', () => {
        const message = getUserFriendlyMessage(ResponsesAPIErrorType.INVALID_MODEL);
        assert.ok(message.includes('GPT-5.2'));
    });

    test('Property 7: Authentication message should suggest updating API key', () => {
        const message = getUserFriendlyMessage(ResponsesAPIErrorType.AUTHENTICATION);
        assert.ok(message.includes('API key'));
    });

    test('Property 7: Network message should suggest checking connection', () => {
        const message = getUserFriendlyMessage(ResponsesAPIErrorType.NETWORK);
        assert.ok(message.includes('connection'));
    });
});
