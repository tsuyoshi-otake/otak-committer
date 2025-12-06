/**
 * Property-based tests for standardized command context
 * 
 * **Feature: extension-architecture-refactoring, Property 10: Standardized Command Context**
 * **Validates: Requirements 5.4**
 * 
 * This test ensures that all commands receive a standardized context object
 * that includes the extension context, logger, config manager, and storage manager.
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import * as vscode from 'vscode';
import { BaseCommand } from '../../commands/BaseCommand';
import { Logger } from '../../infrastructure/logging/Logger';
import { ConfigManager } from '../../infrastructure/config/ConfigManager';
import { StorageManager } from '../../infrastructure/storage/StorageManager';
import { runPropertyTest, createTaggedPropertyTest } from '../../test/helpers/property-test.helper';

/**
 * Test command implementation for property testing
 */
class TestCommand extends BaseCommand {
    public executeCalled = false;
    public executeArgs: any[] = [];

    async execute(...args: any[]): Promise<void> {
        this.executeCalled = true;
        this.executeArgs = args;
    }

    // Expose protected members for testing
    public getLogger(): Logger {
        return this.logger;
    }

    public getConfig(): ConfigManager {
        return this.config;
    }

    public getStorage(): StorageManager {
        return this.storage;
    }

    public getContext(): vscode.ExtensionContext {
        return this.context;
    }

    public async testWithProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
        return this.withProgress(title, task);
    }

    public testHandleError(error: unknown, operation: string): void {
        this.handleError(error, operation);
    }
}

suite('Command Context Properties', () => {
    let mockContext: vscode.ExtensionContext;

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
    });

    /**
     * Property 10: Standardized Command Context
     * 
     * For any command C, when C is executed, it should receive a standardized
     * context object that includes the extension context, logger, config manager,
     * and storage manager.
     * 
     * This property verifies that:
     * 1. All commands extending BaseCommand have access to logger
     * 2. All commands extending BaseCommand have access to config manager
     * 3. All commands extending BaseCommand have access to storage manager
     * 4. All commands extending BaseCommand have access to extension context
     * 5. The context is properly initialized and accessible
     */
    test('Property 10: Standardized Command Context', createTaggedPropertyTest(
        'extension-architecture-refactoring',
        10,
        'Standardized Command Context',
        () => {
            runPropertyTest(
                fc.asyncProperty(
                    fc.array(fc.anything(), { minLength: 0, maxLength: 5 }),
                    async (args) => {
                        // Create a command instance
                        const command = new TestCommand(mockContext);

                        // Verify that all standardized context components are available
                        const logger = command.getLogger();
                        const config = command.getConfig();
                        const storage = command.getStorage();
                        const context = command.getContext();

                        // 1. Logger should be defined and be the singleton instance
                        assert.ok(
                            logger !== undefined,
                            'Command should have access to logger'
                        );
                        assert.ok(
                            logger instanceof Logger,
                            'Logger should be an instance of Logger class'
                        );
                        assert.strictEqual(
                            logger,
                            Logger.getInstance(),
                            'Logger should be the singleton instance'
                        );

                        // 2. Config manager should be defined and functional
                        assert.ok(
                            config !== undefined,
                            'Command should have access to config manager'
                        );
                        assert.ok(
                            config instanceof ConfigManager,
                            'Config should be an instance of ConfigManager class'
                        );
                        assert.ok(
                            typeof config.get === 'function',
                            'Config manager should have get method'
                        );
                        assert.ok(
                            typeof config.set === 'function',
                            'Config manager should have set method'
                        );

                        // 3. Storage manager should be defined and functional
                        assert.ok(
                            storage !== undefined,
                            'Command should have access to storage manager'
                        );
                        assert.ok(
                            storage instanceof StorageManager,
                            'Storage should be an instance of StorageManager class'
                        );
                        assert.ok(
                            typeof storage.getApiKey === 'function',
                            'Storage manager should have getApiKey method'
                        );
                        assert.ok(
                            typeof storage.setApiKey === 'function',
                            'Storage manager should have setApiKey method'
                        );

                        // 4. Extension context should be defined and match the provided context
                        assert.ok(
                            context !== undefined,
                            'Command should have access to extension context'
                        );
                        assert.strictEqual(
                            context,
                            mockContext,
                            'Extension context should match the provided context'
                        );

                        // 5. Verify that execute method can be called with any arguments
                        await command.execute(...args);
                        assert.ok(
                            command.executeCalled,
                            'Execute method should be callable'
                        );
                        assert.deepStrictEqual(
                            command.executeArgs,
                            args,
                            'Execute method should receive the correct arguments'
                        );
                        return true;
                    }
                )
            );
        }
    ));

    /**
     * Additional test: Helper methods are available and functional
     * 
     * Verifies that BaseCommand provides helper methods (withProgress, handleError)
     * that are accessible to all command implementations.
     */
    test('Helper methods should be available to all commands', () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 100 }),
                fc.integer({ min: 1, max: 1000 }),
                async (progressTitle, resultValue) => {
                    const command = new TestCommand(mockContext);

                    // Test withProgress helper
                    const result = await command.testWithProgress(
                        progressTitle,
                        async () => resultValue
                    );

                    assert.strictEqual(
                        result,
                        resultValue,
                        'withProgress should return the task result'
                    );

                    return true;
                }
            )
        );
    });

    /**
     * Additional test: Error handling is standardized across commands
     * 
     * Verifies that all commands use the same error handling pattern through
     * the handleError helper method.
     */
    test('Error handling should be standardized across commands', () => {
        let capturedErrors: Array<{ error: unknown; operation: string; component: string }> = [];

        // Mock ErrorHandler to capture calls
        const ErrorHandler = require('../../infrastructure/error/ErrorHandler').ErrorHandler;
        const originalHandle = ErrorHandler.handle;
        ErrorHandler.handle = (error: unknown, context: any) => {
            const ctx = typeof context === 'string'
                ? { operation: context, component: 'unknown' }
                : context;
            capturedErrors.push({
                error,
                operation: ctx.operation,
                component: ctx.component
            });
        };

        try {
            runPropertyTest(
                fc.property(
                    fc.oneof(
                        fc.record({
                            type: fc.constant('Error'),
                            message: fc.string({ minLength: 1, maxLength: 100 })
                        }),
                        fc.record({
                            type: fc.constant('string'),
                            message: fc.string({ minLength: 1, maxLength: 100 })
                        })
                    ),
                    fc.string({ minLength: 1, maxLength: 50 }),
                    (errorSpec, operation) => {
                        capturedErrors = [];

                        const command = new TestCommand(mockContext);

                        // Create error based on spec
                        const error = errorSpec.type === 'Error'
                            ? new Error(errorSpec.message)
                            : errorSpec.message;

                        // Handle error through command
                        command.testHandleError(error, operation);

                        // Verify that error was captured
                        assert.strictEqual(
                            capturedErrors.length,
                            1,
                            'Error should be handled through centralized handler'
                        );

                        // Verify that operation is included
                        assert.strictEqual(
                            capturedErrors[0].operation,
                            operation,
                            'Operation should be included in error context'
                        );

                        // Verify that component name is the command class name
                        assert.strictEqual(
                            capturedErrors[0].component,
                            'TestCommand',
                            'Component should be the command class name'
                        );

                        return true;
                    }
                )
            );
        } finally {
            // Restore original ErrorHandler
            ErrorHandler.handle = originalHandle;
        }
    });

    /**
     * Additional test: Multiple command instances have independent contexts
     * 
     * Verifies that creating multiple command instances doesn't cause
     * context sharing or interference.
     */
    test('Multiple command instances should have independent contexts', () => {
        runPropertyTest(
            fc.property(
                fc.integer({ min: 2, max: 10 }),
                (numCommands) => {
                    const commands: TestCommand[] = [];

                    // Create multiple command instances
                    for (let i = 0; i < numCommands; i++) {
                        commands.push(new TestCommand(mockContext));
                    }

                    // Verify that all commands have their own context components
                    for (let i = 0; i < commands.length; i++) {
                        const command = commands[i];

                        // Each command should have access to all context components
                        assert.ok(
                            command.getLogger() !== undefined,
                            `Command ${i} should have logger`
                        );
                        assert.ok(
                            command.getConfig() !== undefined,
                            `Command ${i} should have config`
                        );
                        assert.ok(
                            command.getStorage() !== undefined,
                            `Command ${i} should have storage`
                        );
                        assert.ok(
                            command.getContext() !== undefined,
                            `Command ${i} should have context`
                        );

                        // Logger should be the same singleton instance across all commands
                        assert.strictEqual(
                            command.getLogger(),
                            Logger.getInstance(),
                            `Command ${i} logger should be singleton instance`
                        );

                        // Context should be the same reference
                        assert.strictEqual(
                            command.getContext(),
                            mockContext,
                            `Command ${i} context should match provided context`
                        );
                    }

                    return true;
                }
            )
        );
    });

    /**
     * Additional test: Context is available before execute is called
     * 
     * Verifies that the standardized context is available immediately after
     * command construction, not just during execute.
     */
    test('Context should be available immediately after construction', () => {
        runPropertyTest(
            fc.property(
                fc.constant(null),
                () => {
                    const command = new TestCommand(mockContext);

                    // Verify context is available before execute is called
                    assert.ok(
                        command.getLogger() !== undefined,
                        'Logger should be available before execute'
                    );
                    assert.ok(
                        command.getConfig() !== undefined,
                        'Config should be available before execute'
                    );
                    assert.ok(
                        command.getStorage() !== undefined,
                        'Storage should be available before execute'
                    );
                    assert.ok(
                        command.getContext() !== undefined,
                        'Context should be available before execute'
                    );

                    // Verify execute has not been called yet
                    assert.strictEqual(
                        command.executeCalled,
                        false,
                        'Execute should not have been called yet'
                    );

                    return true;
                }
            )
        );
    });
});
