/**
 * Property-based tests for centralized error handling
 * 
 * **Feature: extension-architecture-refactoring, Property 7: Centralized Error Handling**
 * **Validates: Requirements 4.1**
 * 
 * This test ensures that all errors are routed through the ErrorHandler class
 * rather than being handled locally with ad-hoc error handling code.
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import * as vscode from 'vscode';
import { ErrorHandler } from '../../infrastructure/error/ErrorHandler';
import { Logger } from '../../infrastructure/logging/Logger';
import {
    ValidationError,
    ServiceError,
    StorageError,
    CommandError,
    CriticalError
} from '../../types/errors';
import { runPropertyTest, createTaggedPropertyTest } from '../../test/helpers/property-test.helper';

suite('Error Handling Properties', () => {
    let originalShowErrorMessage: typeof vscode.window.showErrorMessage;
    let originalShowWarningMessage: typeof vscode.window.showWarningMessage;
    let originalShowInformationMessage: typeof vscode.window.showInformationMessage;
    let loggerInstance: Logger;
    let capturedNotifications: Array<{ severity: string; message: string }>;
    let capturedLogs: Array<{ level: string; message: string; error?: unknown }>;

    setup(() => {
        // Capture notifications
        capturedNotifications = [];
        
        originalShowErrorMessage = vscode.window.showErrorMessage;
        originalShowWarningMessage = vscode.window.showWarningMessage;
        originalShowInformationMessage = vscode.window.showInformationMessage;

        // Mock VS Code notification methods
        (vscode.window as any).showErrorMessage = (message: string) => {
            capturedNotifications.push({ severity: 'error', message });
            return Promise.resolve(undefined);
        };

        (vscode.window as any).showWarningMessage = (message: string) => {
            capturedNotifications.push({ severity: 'warning', message });
            return Promise.resolve(undefined);
        };

        (vscode.window as any).showInformationMessage = (message: string) => {
            capturedNotifications.push({ severity: 'info', message });
            return Promise.resolve(undefined);
        };

        // Capture logs
        capturedLogs = [];
        loggerInstance = Logger.getInstance();
        
        // Mock logger methods
        const originalError = loggerInstance.error.bind(loggerInstance);
        const originalWarning = loggerInstance.warning.bind(loggerInstance);
        const originalInfo = loggerInstance.info.bind(loggerInstance);

        loggerInstance.error = (message: string, error?: unknown) => {
            capturedLogs.push({ level: 'error', message, error });
            originalError(message, error);
        };

        loggerInstance.warning = (message: string, error?: unknown) => {
            capturedLogs.push({ level: 'warning', message, error });
            originalWarning(message, error as any);
        };

        loggerInstance.info = (message: string, ...args: any[]) => {
            capturedLogs.push({ level: 'info', message, error: args[0] });
            originalInfo(message, ...args);
        };
    });

    teardown(() => {
        // Restore original methods
        (vscode.window as any).showErrorMessage = originalShowErrorMessage;
        (vscode.window as any).showWarningMessage = originalShowWarningMessage;
        (vscode.window as any).showInformationMessage = originalShowInformationMessage;
    });

    /**
     * Property 7: Centralized Error Handling
     * 
     * For any error E that occurs in any component, E should be routed through
     * the ErrorHandler class rather than being handled locally with ad-hoc
     * error handling code.
     * 
     * This property verifies that:
     * 1. ErrorHandler.handle() processes all error types consistently
     * 2. Errors are logged with appropriate severity
     * 3. User notifications are shown based on error severity
     * 4. Error context is properly formatted and included
     */
    test('Property 7: Centralized Error Handling', createTaggedPropertyTest(
        'extension-architecture-refactoring',
        7,
        'Centralized Error Handling',
        () => {
            // Test with various error types and contexts
            runPropertyTest(
                fc.property(
                    fc.oneof(
                        // Generate different error types
                        fc.record({
                            type: fc.constant('ValidationError'),
                            message: fc.string({ minLength: 1, maxLength: 100 }),
                            context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
                        }),
                        fc.record({
                            type: fc.constant('ServiceError'),
                            message: fc.string({ minLength: 1, maxLength: 100 }),
                            service: fc.constantFrom('OpenAI', 'GitHub', 'Git'),
                            context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
                        }),
                        fc.record({
                            type: fc.constant('StorageError'),
                            message: fc.string({ minLength: 1, maxLength: 100 }),
                            context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
                        }),
                        fc.record({
                            type: fc.constant('CommandError'),
                            message: fc.string({ minLength: 1, maxLength: 100 }),
                            commandId: fc.string({ minLength: 1, maxLength: 50 }),
                            context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
                        }),
                        fc.record({
                            type: fc.constant('CriticalError'),
                            message: fc.string({ minLength: 1, maxLength: 100 }),
                            context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
                        }),
                        fc.record({
                            type: fc.constant('Error'),
                            message: fc.string({ minLength: 1, maxLength: 100 })
                        }),
                        fc.record({
                            type: fc.constant('string'),
                            message: fc.string({ minLength: 1, maxLength: 100 })
                        })
                    ),
                    fc.record({
                        operation: fc.string({ minLength: 1, maxLength: 50 }),
                        component: fc.string({ minLength: 1, maxLength: 50 }),
                        metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined })
                    }),
                    (errorSpec, context) => {
                        // Clear captured data
                        capturedNotifications = [];
                        capturedLogs = [];

                        // Create error based on spec
                        let error: unknown;
                        switch (errorSpec.type) {
                            case 'ValidationError':
                                error = new ValidationError(errorSpec.message, errorSpec.context);
                                break;
                            case 'ServiceError':
                                error = new ServiceError(
                                    errorSpec.message,
                                    (errorSpec as any).service,
                                    errorSpec.context
                                );
                                break;
                            case 'StorageError':
                                error = new StorageError(errorSpec.message, errorSpec.context);
                                break;
                            case 'CommandError':
                                error = new CommandError(
                                    errorSpec.message,
                                    (errorSpec as any).commandId,
                                    errorSpec.context
                                );
                                break;
                            case 'CriticalError':
                                error = new CriticalError(errorSpec.message, errorSpec.context);
                                break;
                            case 'Error':
                                error = new Error(errorSpec.message);
                                break;
                            case 'string':
                                error = errorSpec.message;
                                break;
                            default:
                                error = new Error('Unknown error');
                        }

                        // Handle error through centralized handler
                        ErrorHandler.handle(error, context);

                        // Verify that error was logged
                        const wasLogged = capturedLogs.length > 0;
                        assert.ok(
                            wasLogged,
                            'Error should be logged through centralized handler'
                        );

                        // Verify that user was notified
                        const wasNotified = capturedNotifications.length > 0;
                        assert.ok(
                            wasNotified,
                            'User should be notified through centralized handler'
                        );

                        // Verify that error message includes context
                        const logMessage = capturedLogs[0].message;
                        assert.ok(
                            logMessage.includes(context.component),
                            `Log message should include component name: ${context.component}`
                        );
                        assert.ok(
                            logMessage.includes(context.operation),
                            `Log message should include operation: ${context.operation}`
                        );

                        // Verify severity mapping is consistent
                        const actualNotificationSeverity = capturedNotifications[0].severity;
                        const actualLogLevel = capturedLogs[0].level;

                        // Map notification severity to log level
                        const severityToLogLevel: Record<string, string> = {
                            'error': 'error',
                            'warning': 'warning',
                            'info': 'info'
                        };

                        assert.strictEqual(
                            actualLogLevel,
                            severityToLogLevel[actualNotificationSeverity],
                            'Log level should match notification severity'
                        );

                        return true;
                    }
                )
            );
        }
    ));

    /**
     * Additional test: Error severity determination is consistent
     * 
     * Verifies that the same error type always maps to the same severity level.
     */
    test('Error severity determination should be consistent', () => {
        runPropertyTest(
            fc.property(
                fc.string({ minLength: 1, maxLength: 100 }),
                (message) => {
                    const errors = [
                        new CriticalError(message),
                        new ValidationError(message),
                        new CommandError(message, 'test-command'),
                        new ServiceError(message, 'test-service'),
                        new StorageError(message),
                        new Error(message)
                    ];

                    const expectedSeverities = [
                        'error', // CriticalError
                        'warning', // ValidationError
                        'error', // CommandError
                        'error', // ServiceError
                        'error', // StorageError
                        'error'  // Error
                    ];

                    errors.forEach((error, index) => {
                        capturedNotifications = [];
                        capturedLogs = [];

                        ErrorHandler.handle(error, {
                            operation: 'test',
                            component: 'test'
                        });

                        assert.strictEqual(
                            capturedNotifications[0].severity,
                            expectedSeverities[index],
                            `${error.constructor.name} should map to ${expectedSeverities[index]} severity`
                        );
                    });

                    return true;
                }
            )
        );
    });

    /**
     * Additional test: String context is properly converted to ErrorContext
     * 
     * Verifies that when a string is passed as context, it's properly converted
     * to an ErrorContext object.
     */
    test('String context should be converted to ErrorContext', () => {
        runPropertyTest(
            fc.property(
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.string({ minLength: 1, maxLength: 100 }),
                (errorMessage, contextString) => {
                    capturedNotifications = [];
                    capturedLogs = [];

                    const error = new Error(errorMessage);
                    ErrorHandler.handle(error, contextString);

                    // Verify that the context string appears in the log message
                    const logMessage = capturedLogs[0].message;
                    assert.ok(
                        logMessage.includes(contextString),
                        `Log message should include context string: ${contextString}`
                    );

                    // Verify that component is set to 'unknown' when string context is used
                    assert.ok(
                        logMessage.includes('[unknown]'),
                        'Component should be set to "unknown" for string context'
                    );

                    return true;
                }
            )
        );
    });
});
