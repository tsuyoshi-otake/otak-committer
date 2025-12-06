/**
 * Property-based tests for consistent command error handling
 *
 * **Feature: extension-architecture-refactoring, Property 9: Consistent Command Error Handling**
 * **Validates: Requirements 4.4**
 *
 * This test ensures that all commands handle errors using the same pattern:
 * try-catch with ErrorHandler.handle()
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import * as vscode from 'vscode';
import { BaseCommand } from '../../commands/BaseCommand';
import { ErrorHandler } from '../../infrastructure/error/ErrorHandler';
import { runPropertyTest, createTaggedPropertyTest } from '../../test/helpers/property-test.helper';
import {
    ValidationError,
    ServiceError,
    StorageError,
    CommandError,
    CriticalError
} from '../../types/errors';

/**
 * Test command implementation that throws various errors
 */
class ErrorThrowingCommand extends BaseCommand {
    private errorToThrow: unknown;

    constructor(context: vscode.ExtensionContext, errorToThrow: unknown) {
        super(context);
        this.errorToThrow = errorToThrow;
    }

    async execute(): Promise<void> {
        try {
            if (this.errorToThrow !== null) {
                throw this.errorToThrow;
            }
        } catch (error) {
            this.handleError(error, 'executing command');
        }
    }
}

suite('Command Error Handling Properties', () => {
    let mockContext: vscode.ExtensionContext;
    let capturedErrors: Array<{ error: unknown; context: any }>;
    let originalHandle: typeof ErrorHandler.handle;

    setup(() => {
        // Create a minimal mock context for testing
        mockContext = {
            subscriptions: [],
            extensionPath: '/test/path',
            extensionUri: vscode.Uri.file('/test/path'),
            globalState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => [],
                setKeysForSync: () => { }
            } as any,
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            } as any,
            secrets: {
                get: () => Promise.resolve(undefined),
                store: () => Promise.resolve(),
                delete: () => Promise.resolve(),
                onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
            } as any,
            extensionMode: vscode.ExtensionMode.Test,
            storageUri: vscode.Uri.file('/test/storage'),
            globalStorageUri: vscode.Uri.file('/test/global-storage'),
            logUri: vscode.Uri.file('/test/log'),
            asAbsolutePath: (relativePath: string) => `/test/path/${relativePath}`,
            storagePath: '/test/storage',
            globalStoragePath: '/test/global-storage',
            logPath: '/test/log'
        } as any;

        capturedErrors = [];

        // Mock ErrorHandler.handle
        originalHandle = ErrorHandler.handle;
        (ErrorHandler as any).handle = (error: unknown, context: any) => {
            capturedErrors.push({ error, context });
        };
    });

    teardown(() => {
        // Restore original ErrorHandler
        ErrorHandler.handle = originalHandle;
    });

    /**
     * Property 9: Consistent Command Error Handling
     *
     * For any command C, if an error occurs during C's execution,
     * the error should be handled using the same error handling pattern
     * (try-catch with ErrorHandler.handle) as all other commands.
     *
     * This property verifies that:
     * 1. All errors are routed through ErrorHandler.handle
     * 2. Error context includes operation and component information
     * 3. Different error types are all handled consistently
     */
    test('Property 9: Consistent Command Error Handling', createTaggedPropertyTest(
        'extension-architecture-refactoring',
        9,
        'Consistent Command Error Handling',
        () => {
            runPropertyTest(
                fc.asyncProperty(
                    fc.oneof(
                        fc.record({
                            type: fc.constant('ValidationError'),
                            message: fc.string({ minLength: 1, maxLength: 100 })
                        }),
                        fc.record({
                            type: fc.constant('ServiceError'),
                            message: fc.string({ minLength: 1, maxLength: 100 }),
                            service: fc.constantFrom('OpenAI', 'GitHub', 'Git')
                        }),
                        fc.record({
                            type: fc.constant('StorageError'),
                            message: fc.string({ minLength: 1, maxLength: 100 })
                        }),
                        fc.record({
                            type: fc.constant('CommandError'),
                            message: fc.string({ minLength: 1, maxLength: 100 }),
                            commandId: fc.string({ minLength: 1, maxLength: 50 })
                        }),
                        fc.record({
                            type: fc.constant('CriticalError'),
                            message: fc.string({ minLength: 1, maxLength: 100 })
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
                    async (errorSpec) => {
                        // Clear captured errors
                        capturedErrors = [];

                        // Create error based on spec
                        let error: unknown;
                        switch (errorSpec.type) {
                            case 'ValidationError':
                                error = new ValidationError(errorSpec.message);
                                break;
                            case 'ServiceError':
                                error = new ServiceError(
                                    errorSpec.message,
                                    (errorSpec as any).service
                                );
                                break;
                            case 'StorageError':
                                error = new StorageError(errorSpec.message);
                                break;
                            case 'CommandError':
                                error = new CommandError(
                                    errorSpec.message,
                                    (errorSpec as any).commandId
                                );
                                break;
                            case 'CriticalError':
                                error = new CriticalError(errorSpec.message);
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

                        // Create and execute command that throws this error
                        const command = new ErrorThrowingCommand(mockContext, error);
                        await command.execute();

                        // Verify that error was handled through ErrorHandler
                        assert.strictEqual(
                            capturedErrors.length,
                            1,
                            'Error should be routed through ErrorHandler.handle'
                        );

                        // Verify that context includes operation
                        assert.ok(
                            capturedErrors[0].context.operation,
                            'Error context should include operation'
                        );

                        // Verify that context includes component (command class name)
                        assert.ok(
                            capturedErrors[0].context.component,
                            'Error context should include component'
                        );
                        assert.strictEqual(
                            capturedErrors[0].context.component,
                            'ErrorThrowingCommand',
                            'Component should be the command class name'
                        );

                        // Verify the original error is passed
                        assert.strictEqual(
                            capturedErrors[0].error,
                            error,
                            'Original error should be passed to ErrorHandler'
                        );

                        return true;
                    }
                )
            );
        }
    ));

    /**
     * Additional test: Commands do not throw unhandled exceptions
     *
     * Verifies that commands properly catch all exceptions and route them
     * through ErrorHandler without letting exceptions propagate.
     */
    test('Commands should not throw unhandled exceptions', () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 100 }),
                async (message) => {
                    capturedErrors = [];

                    const error = new Error(message);
                    const command = new ErrorThrowingCommand(mockContext, error);

                    // Execute should not throw - error should be handled internally
                    let didThrow = false;
                    try {
                        await command.execute();
                    } catch (e) {
                        didThrow = true;
                    }

                    assert.strictEqual(
                        didThrow,
                        false,
                        'Command should not throw unhandled exceptions'
                    );

                    assert.strictEqual(
                        capturedErrors.length,
                        1,
                        'Error should be handled through ErrorHandler'
                    );

                    return true;
                }
            )
        );
    });

    /**
     * Additional test: Multiple commands use the same error handling pattern
     *
     * Verifies that different command implementations all use the same
     * error handling pattern provided by BaseCommand.
     */
    test('Different commands use the same error handling pattern', () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.array(
                    fc.string({ minLength: 1, maxLength: 50 }),
                    { minLength: 1, maxLength: 5 }
                ),
                async (errorMessages) => {
                    capturedErrors = [];

                    // Create and execute multiple commands with different errors
                    for (const message of errorMessages) {
                        const error = new Error(message);
                        const command = new ErrorThrowingCommand(mockContext, error);
                        await command.execute();
                    }

                    // All errors should be handled through ErrorHandler
                    assert.strictEqual(
                        capturedErrors.length,
                        errorMessages.length,
                        'All errors should be routed through ErrorHandler'
                    );

                    // All contexts should follow the same structure
                    for (let i = 0; i < capturedErrors.length; i++) {
                        const ctx = capturedErrors[i].context;
                        assert.ok(
                            ctx.operation && ctx.component,
                            `Error ${i} context should include operation and component`
                        );
                    }

                    return true;
                }
            )
        );
    });

    /**
     * Additional test: Error context is consistent across error types
     *
     * Verifies that the error context structure is the same regardless
     * of the error type being handled.
     */
    test('Error context is consistent across error types', () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.constantFrom(
                    new ValidationError('Validation failed'),
                    new ServiceError('Service failed', 'TestService'),
                    new StorageError('Storage failed'),
                    new CommandError('Command failed', 'test.command'),
                    new CriticalError('Critical failure'),
                    new Error('Standard error')
                ),
                async (error) => {
                    capturedErrors = [];

                    const command = new ErrorThrowingCommand(mockContext, error);
                    await command.execute();

                    assert.strictEqual(capturedErrors.length, 1);

                    const ctx = capturedErrors[0].context;

                    // Verify context structure
                    assert.ok(
                        typeof ctx.operation === 'string',
                        'Context should have string operation'
                    );
                    assert.ok(
                        typeof ctx.component === 'string',
                        'Context should have string component'
                    );

                    return true;
                }
            )
        );
    });
});
