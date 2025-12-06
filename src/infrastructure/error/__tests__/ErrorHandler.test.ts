/**
 * Unit tests for ErrorHandler
 * Tests error severity mapping, user notifications, and message formatting
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ErrorHandler } from '../ErrorHandler.js';
import { Logger } from '../../logging/Logger.js';
import {
    BaseError,
    ValidationError,
    ServiceError,
    StorageError,
    CommandError,
    CriticalError
} from '../../../types/errors/index.js';

suite('ErrorHandler Unit Tests', () => {
    let loggedMessages: Array<{ level: string; message: string; error?: unknown }>;
    let userNotifications: Array<{ type: string; message: string }>;
    let originalLoggerMethods: any;
    let originalVSCodeMethods: any;

    setup(() => {
        loggedMessages = [];
        userNotifications = [];

        // Mock Logger methods
        const logger = Logger.getInstance();
        originalLoggerMethods = {
            error: logger.error.bind(logger),
            warning: logger.warning.bind(logger),
            info: logger.info.bind(logger)
        };

        logger.error = (message: string, error?: unknown) => {
            loggedMessages.push({ level: 'error', message, error });
        };
        logger.warning = (message: string, error?: unknown) => {
            loggedMessages.push({ level: 'warning', message, error });
        };
        logger.info = (message: string, error?: unknown) => {
            loggedMessages.push({ level: 'info', message, error });
        };

        // Mock VS Code window methods
        originalVSCodeMethods = {
            showErrorMessage: vscode.window.showErrorMessage,
            showWarningMessage: vscode.window.showWarningMessage,
            showInformationMessage: vscode.window.showInformationMessage
        };

        vscode.window.showErrorMessage = (message: string) => {
            userNotifications.push({ type: 'error', message });
            return Promise.resolve(undefined);
        };
        vscode.window.showWarningMessage = (message: string) => {
            userNotifications.push({ type: 'warning', message });
            return Promise.resolve(undefined);
        };
        vscode.window.showInformationMessage = (message: string) => {
            userNotifications.push({ type: 'info', message });
            return Promise.resolve(undefined);
        };
    });

    teardown(() => {
        // Restore original methods
        const logger = Logger.getInstance();
        logger.error = originalLoggerMethods.error;
        logger.warning = originalLoggerMethods.warning;
        logger.info = originalLoggerMethods.info;

        vscode.window.showErrorMessage = originalVSCodeMethods.showErrorMessage;
        vscode.window.showWarningMessage = originalVSCodeMethods.showWarningMessage;
        vscode.window.showInformationMessage = originalVSCodeMethods.showInformationMessage;

        loggedMessages = [];
        userNotifications = [];
    });

    suite('Error Severity Mapping', () => {
        test('should map CriticalError to Critical severity', () => {
            const error = new CriticalError('Critical failure');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'error');
            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'error');
        });

        test('should map ValidationError to Warning severity', () => {
            const error = new ValidationError('Invalid input');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'warning');
            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'warning');
        });

        test('should map CommandError to Error severity', () => {
            const error = new CommandError('Command failed', 'test.command');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'error');
            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'error');
        });

        test('should map ServiceError to Error severity', () => {
            const error = new ServiceError('Service failed', 'TestService');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'error');
            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'error');
        });

        test('should map StorageError to Error severity', () => {
            const error = new StorageError('Storage failed');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'error');
            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'error');
        });

        test('should map generic BaseError to Error severity', () => {
            class CustomError extends BaseError {
                constructor(message: string) {
                    super(message, 'CUSTOM_ERROR');
                }
            }
            const error = new CustomError('Custom error');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'error');
            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'error');
        });

        test('should map standard Error to Error severity', () => {
            const error = new Error('Standard error');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'error');
            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'error');
        });

        test('should map unknown error types to Error severity', () => {
            const error = 'String error';
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'error');
            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'error');
        });
    });

    suite('User Notification for Different Severities', () => {
        test('should show error message for Critical severity', () => {
            const error = new CriticalError('Critical failure');
            ErrorHandler.handle(error, { operation: 'test', component: 'TestComponent' });

            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'error');
            assert.ok(userNotifications[0].message.includes('Critical failure'));
        });

        test('should show error message for Error severity', () => {
            const error = new ServiceError('Service failed', 'TestService');
            ErrorHandler.handle(error, { operation: 'test', component: 'TestComponent' });

            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'error');
            assert.ok(userNotifications[0].message.includes('Service failed'));
        });

        test('should show warning message for Warning severity', () => {
            const error = new ValidationError('Invalid input');
            ErrorHandler.handle(error, { operation: 'test', component: 'TestComponent' });

            assert.strictEqual(userNotifications.length, 1);
            assert.strictEqual(userNotifications[0].type, 'warning');
            assert.ok(userNotifications[0].message.includes('Invalid input'));
        });

        test('should clean technical prefixes from user messages', () => {
            const error = new Error('Test error');
            ErrorHandler.handle(error, { operation: 'testOp', component: 'TestComponent' });

            assert.strictEqual(userNotifications.length, 1);
            // Message should not contain [TestComponent] prefix
            assert.ok(!userNotifications[0].message.includes('[TestComponent]'));
            // But should contain the actual error message
            assert.ok(userNotifications[0].message.includes('Test error'));
        });

        test('should handle string context parameter', () => {
            const error = new Error('Test error');
            ErrorHandler.handle(error, 'simple operation');

            assert.strictEqual(userNotifications.length, 1);
            assert.ok(userNotifications[0].message.includes('Test error'));
        });
    });

    suite('Error Message Formatting', () => {
        test('should format message with component and operation', () => {
            const error = new Error('Test error');
            ErrorHandler.handle(error, {
                operation: 'testOperation',
                component: 'TestComponent'
            });

            assert.strictEqual(loggedMessages.length, 1);
            const message = loggedMessages[0].message;
            assert.ok(message.includes('[TestComponent]'));
            assert.ok(message.includes('testOperation'));
            assert.ok(message.includes('Test error'));
        });

        test('should format BaseError with toString method', () => {
            const error = new ValidationError('Invalid value', { field: 'email' });
            ErrorHandler.handle(error, {
                operation: 'validate',
                component: 'Validator'
            });

            assert.strictEqual(loggedMessages.length, 1);
            const message = loggedMessages[0].message;
            assert.ok(message.includes('[Validator]'));
            assert.ok(message.includes('validate'));
            assert.ok(message.includes('Invalid value'));
        });

        test('should format standard Error with message property', () => {
            const error = new Error('Standard error message');
            ErrorHandler.handle(error, {
                operation: 'process',
                component: 'Processor'
            });

            assert.strictEqual(loggedMessages.length, 1);
            const message = loggedMessages[0].message;
            assert.ok(message.includes('[Processor]'));
            assert.ok(message.includes('process'));
            assert.ok(message.includes('Standard error message'));
        });

        test('should format unknown error types as strings', () => {
            const error = { custom: 'error object' };
            ErrorHandler.handle(error, {
                operation: 'handle',
                component: 'Handler'
            });

            assert.strictEqual(loggedMessages.length, 1);
            const message = loggedMessages[0].message;
            assert.ok(message.includes('[Handler]'));
            assert.ok(message.includes('handle'));
            assert.ok(message.includes('[object Object]'));
        });

        test('should handle string context by creating default context object', () => {
            const error = new Error('Test error');
            ErrorHandler.handle(error, 'operation name');

            assert.strictEqual(loggedMessages.length, 1);
            const message = loggedMessages[0].message;
            assert.ok(message.includes('[unknown]'));
            assert.ok(message.includes('operation name'));
            assert.ok(message.includes('Test error'));
        });

        test('should include metadata in context', () => {
            const error = new Error('Test error');
            ErrorHandler.handle(error, {
                operation: 'test',
                component: 'TestComponent',
                metadata: { userId: '123', action: 'save' }
            });

            assert.strictEqual(loggedMessages.length, 1);
            // Metadata is part of the context but not directly in the message
            // The error object should be passed to the logger
            assert.ok(loggedMessages[0].error);
        });

        test('should format message consistently across error types', () => {
            const errors = [
                new CriticalError('Critical'),
                new ValidationError('Validation'),
                new ServiceError('Service', 'Test'),
                new StorageError('Storage'),
                new CommandError('Command', 'test.cmd'),
                new Error('Standard')
            ];

            errors.forEach((error, index) => {
                ErrorHandler.handle(error, {
                    operation: `op${index}`,
                    component: `Component${index}`
                });
            });

            assert.strictEqual(loggedMessages.length, errors.length);
            
            // All messages should follow the same format: [Component] operation: message
            loggedMessages.forEach((log, index) => {
                assert.ok(log.message.includes(`[Component${index}]`));
                assert.ok(log.message.includes(`op${index}`));
                assert.ok(log.message.includes(':'));
            });
        });
    });

    suite('Logging Integration', () => {
        test('should log error with error level for Critical severity', () => {
            const error = new CriticalError('Critical failure');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'error');
            assert.ok(loggedMessages[0].error);
        });

        test('should log error with error level for Error severity', () => {
            const error = new ServiceError('Service failed', 'Test');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'error');
            assert.ok(loggedMessages[0].error);
        });

        test('should log error with warning level for Warning severity', () => {
            const error = new ValidationError('Invalid input');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].level, 'warning');
            assert.ok(loggedMessages[0].error);
        });

        test('should pass original error object to logger', () => {
            const originalError = new Error('Original error');
            ErrorHandler.handle(originalError, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(loggedMessages[0].error, originalError);
        });
    });

    suite('Edge Cases', () => {
        test('should handle null error', () => {
            ErrorHandler.handle(null, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(userNotifications.length, 1);
            assert.ok(loggedMessages[0].message.includes('null'));
        });

        test('should handle undefined error', () => {
            ErrorHandler.handle(undefined, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(userNotifications.length, 1);
            assert.ok(loggedMessages[0].message.includes('undefined'));
        });

        test('should handle empty string error', () => {
            ErrorHandler.handle('', { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(userNotifications.length, 1);
        });

        test('should handle error with empty context', () => {
            const error = new Error('Test error');
            ErrorHandler.handle(error, { operation: '', component: '' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.strictEqual(userNotifications.length, 1);
        });

        test('should handle error with special characters in message', () => {
            const error = new Error('Error with [brackets] and {braces} and <angles>');
            ErrorHandler.handle(error, { operation: 'test', component: 'test' });

            assert.strictEqual(loggedMessages.length, 1);
            assert.ok(loggedMessages[0].message.includes('[brackets]'));
            assert.ok(loggedMessages[0].message.includes('{braces}'));
            assert.ok(loggedMessages[0].message.includes('<angles>'));
        });
    });
});
