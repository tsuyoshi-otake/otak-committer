/**
 * Unit tests for BaseCommand
 *
 * Tests context initialization, withProgress helper, and handleError helper
 *
 * _Requirements: 7.1_
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { BaseCommand } from '../BaseCommand';
import { Logger } from '../../infrastructure/logging/Logger';
import { ConfigManager } from '../../infrastructure/config/ConfigManager';
import { StorageManager } from '../../infrastructure/storage/StorageManager';
import { ErrorHandler } from '../../infrastructure/error/ErrorHandler';

/**
 * Concrete implementation of BaseCommand for testing
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

    // Expose protected methods for testing
    public async testWithProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
        return this.withProgress(title, task);
    }

    public testHandleError(error: unknown, operation: string): void {
        this.handleErrorSilently(error, operation);
    }
}

suite('BaseCommand Unit Tests', () => {
    let mockContext: vscode.ExtensionContext;
    let mockSecrets: vscode.SecretStorage;
    let mockGlobalState: vscode.Memento;
    let mockWorkspaceState: vscode.Memento;

    setup(() => {
        // Create mock secret storage
        const secretStore = new Map<string, string>();
        mockSecrets = {
            get: async (key: string) => secretStore.get(key),
            store: async (key: string, value: string) => {
                secretStore.set(key, value);
            },
            delete: async (key: string) => {
                secretStore.delete(key);
            },
            onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
        };

        // Create mock global state
        const globalStore = new Map<string, any>();
        mockGlobalState = {
            keys: () => Array.from(globalStore.keys()),
            get: <T>(key: string, defaultValue?: T) => {
                return globalStore.has(key) ? globalStore.get(key) : defaultValue;
            },
            update: async (key: string, value: any) => {
                if (value === undefined) {
                    globalStore.delete(key);
                } else {
                    globalStore.set(key, value);
                }
            },
            setKeysForSync: (keys: readonly string[]) => {},
        } as vscode.Memento & { setKeysForSync(keys: readonly string[]): void };

        // Create mock workspace state
        const workspaceStore = new Map<string, any>();
        mockWorkspaceState = {
            keys: () => Array.from(workspaceStore.keys()),
            get: <T>(key: string, defaultValue?: T) => {
                return workspaceStore.has(key) ? workspaceStore.get(key) : defaultValue;
            },
            update: async (key: string, value: any) => {
                if (value === undefined) {
                    workspaceStore.delete(key);
                } else {
                    workspaceStore.set(key, value);
                }
            },
            setKeysForSync: (keys: readonly string[]) => {},
        } as vscode.Memento & { setKeysForSync(keys: readonly string[]): void };

        // Create mock extension context
        mockContext = {
            subscriptions: [],
            workspaceState: mockWorkspaceState,
            globalState: mockGlobalState,
            secrets: mockSecrets,
            extensionUri: vscode.Uri.file('/mock/extension/path'),
            extensionPath: '/mock/extension/path',
            asAbsolutePath: (relativePath: string) => `/mock/extension/path/${relativePath}`,
            storagePath: '/mock/storage/path',
            globalStoragePath: '/mock/global/storage/path',
            logPath: '/mock/log/path',
            extensionMode: vscode.ExtensionMode.Test,
            extension: {} as vscode.Extension<any>,
            environmentVariableCollection: {} as any,
            storageUri: vscode.Uri.file('/mock/storage/uri'),
            globalStorageUri: vscode.Uri.file('/mock/global/storage/uri'),
            logUri: vscode.Uri.file('/mock/log/uri'),
            languageModelAccessInformation: {} as any,
        } as unknown as vscode.ExtensionContext;
    });

    suite('Context Initialization', () => {
        test('should initialize with extension context', () => {
            const command = new TestCommand(mockContext);

            assert.ok(command);
            assert.strictEqual(command.getContext(), mockContext);
        });

        test('should initialize logger instance', () => {
            const command = new TestCommand(mockContext);

            const logger = command.getLogger();
            assert.ok(logger);
            assert.strictEqual(logger, Logger.getInstance());
        });

        test('should initialize config manager', () => {
            const command = new TestCommand(mockContext);

            const config = command.getConfig();
            assert.ok(config);
            assert.ok(config instanceof ConfigManager);
        });

        test('should initialize storage manager with context', () => {
            const command = new TestCommand(mockContext);

            const storage = command.getStorage();
            assert.ok(storage);
            assert.ok(storage instanceof StorageManager);
        });

        test('should have all infrastructure components available', () => {
            const command = new TestCommand(mockContext);

            assert.ok(command.getLogger(), 'Logger should be initialized');
            assert.ok(command.getConfig(), 'ConfigManager should be initialized');
            assert.ok(command.getStorage(), 'StorageManager should be initialized');
            assert.ok(command.getContext(), 'Context should be available');
        });

        test('should share logger singleton across multiple commands', () => {
            const command1 = new TestCommand(mockContext);
            const command2 = new TestCommand(mockContext);

            assert.strictEqual(command1.getLogger(), command2.getLogger());
        });

        test('should create separate config managers for each command', () => {
            const command1 = new TestCommand(mockContext);
            const command2 = new TestCommand(mockContext);

            // ConfigManager instances are separate but access the same underlying config
            assert.ok(command1.getConfig() !== command2.getConfig());
        });

        test('should create separate storage managers for each command', () => {
            const command1 = new TestCommand(mockContext);
            const command2 = new TestCommand(mockContext);

            // StorageManager instances are separate but use the same context
            assert.ok(command1.getStorage() !== command2.getStorage());
        });
    });

    suite('withProgress Helper', () => {
        let progressCalls: Array<{
            title: string;
            location: vscode.ProgressLocation | { viewId: string };
        }>;
        let originalWithProgress: any;

        setup(() => {
            progressCalls = [];

            // Mock vscode.window.withProgress
            originalWithProgress = vscode.window.withProgress;
            (vscode.window as any).withProgress = async (
                options: vscode.ProgressOptions,
                task: (progress: vscode.Progress<any>) => Thenable<any>,
            ) => {
                progressCalls.push({
                    title: options.title || '',
                    location: options.location,
                });

                // Execute the task
                const mockProgress = {
                    report: () => {},
                };
                return await task(mockProgress);
            };
        });

        teardown(() => {
            vscode.window.withProgress = originalWithProgress;
            progressCalls = [];
        });

        test('should execute task with progress notification', async () => {
            const command = new TestCommand(mockContext);
            let taskExecuted = false;

            await command.testWithProgress('Test Progress', async () => {
                taskExecuted = true;
            });

            assert.strictEqual(taskExecuted, true);
            assert.strictEqual(progressCalls.length, 1);
        });

        test('should display correct progress title', async () => {
            const command = new TestCommand(mockContext);

            await command.testWithProgress('Loading data...', async () => {
                // Task logic
            });

            assert.strictEqual(progressCalls.length, 1);
            assert.strictEqual(progressCalls[0].title, 'Loading data...');
        });

        test('should use Notification location', async () => {
            const command = new TestCommand(mockContext);

            await command.testWithProgress('Processing...', async () => {
                // Task logic
            });

            assert.strictEqual(progressCalls.length, 1);
            assert.strictEqual(progressCalls[0].location, vscode.ProgressLocation.Notification);
        });

        test('should return task result', async () => {
            const command = new TestCommand(mockContext);
            const expectedResult = { data: 'test result' };

            const result = await command.testWithProgress('Test', async () => {
                return expectedResult;
            });

            assert.deepStrictEqual(result, expectedResult);
        });

        test('should handle async tasks', async () => {
            const command = new TestCommand(mockContext);
            let counter = 0;

            const result = await command.testWithProgress('Async Task', async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                counter++;
                return counter;
            });

            assert.strictEqual(result, 1);
            assert.strictEqual(counter, 1);
        });

        test('should propagate task errors', async () => {
            const command = new TestCommand(mockContext);
            const testError = new Error('Task failed');

            try {
                await command.testWithProgress('Failing Task', async () => {
                    throw testError;
                });
                assert.fail('Should have thrown error');
            } catch (error) {
                assert.strictEqual(error, testError);
            }
        });

        test('should handle multiple sequential progress calls', async () => {
            const command = new TestCommand(mockContext);

            await command.testWithProgress('First Task', async () => {
                return 'first';
            });

            await command.testWithProgress('Second Task', async () => {
                return 'second';
            });

            assert.strictEqual(progressCalls.length, 2);
            assert.strictEqual(progressCalls[0].title, 'First Task');
            assert.strictEqual(progressCalls[1].title, 'Second Task');
        });

        test('should handle empty title', async () => {
            const command = new TestCommand(mockContext);

            await command.testWithProgress('', async () => {
                return 'result';
            });

            assert.strictEqual(progressCalls.length, 1);
            assert.strictEqual(progressCalls[0].title, '');
        });

        test('should handle tasks that return undefined', async () => {
            const command = new TestCommand(mockContext);

            const result = await command.testWithProgress('Task', async () => {
                // No return value
            });

            assert.strictEqual(result, undefined);
        });

        test('should handle tasks that return primitive values', async () => {
            const command = new TestCommand(mockContext);

            const stringResult = await command.testWithProgress('String Task', async () => 'test');
            const numberResult = await command.testWithProgress('Number Task', async () => 42);
            const boolResult = await command.testWithProgress('Bool Task', async () => true);

            assert.strictEqual(stringResult, 'test');
            assert.strictEqual(numberResult, 42);
            assert.strictEqual(boolResult, true);
        });
    });

    suite('handleError Helper', () => {
        let handledErrors: Array<{ error: unknown; context: any }>;
        let originalHandle: any;

        setup(() => {
            handledErrors = [];

            // Mock ErrorHandler.handle
            originalHandle = ErrorHandler.handle;
            (ErrorHandler as any).handle = (error: unknown, context: any) => {
                handledErrors.push({ error, context });
            };
        });

        teardown(() => {
            ErrorHandler.handle = originalHandle;
            handledErrors = [];
        });

        test('should route error through ErrorHandler', () => {
            const command = new TestCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, 'test operation');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].error, testError);
        });

        test('should include operation in context', () => {
            const command = new TestCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, 'performing action');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].context.operation, 'performing action');
        });

        test('should include component name in context', () => {
            const command = new TestCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, 'test operation');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].context.component, 'TestCommand');
        });

        test('should use constructor name as component', () => {
            class CustomCommand extends BaseCommand {
                async execute(): Promise<void> {}

                public testError(error: unknown, operation: string): void {
                    this.handleErrorSilently(error, operation);
                }
            }

            const command = new CustomCommand(mockContext);
            const testError = new Error('Test error');

            command.testError(testError, 'test');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].context.component, 'CustomCommand');
        });

        test('should handle different error types', () => {
            const command = new TestCommand(mockContext);

            const standardError = new Error('Standard error');
            const typeError = new TypeError('Type error');
            const stringError = 'String error';
            const objectError = { message: 'Object error' };

            command.testHandleError(standardError, 'op1');
            command.testHandleError(typeError, 'op2');
            command.testHandleError(stringError, 'op3');
            command.testHandleError(objectError, 'op4');

            assert.strictEqual(handledErrors.length, 4);
            assert.strictEqual(handledErrors[0].error, standardError);
            assert.strictEqual(handledErrors[1].error, typeError);
            assert.strictEqual(handledErrors[2].error, stringError);
            assert.strictEqual(handledErrors[3].error, objectError);
        });

        test('should handle null and undefined errors', () => {
            const command = new TestCommand(mockContext);

            command.testHandleError(null, 'null error');
            command.testHandleError(undefined, 'undefined error');

            assert.strictEqual(handledErrors.length, 2);
            assert.strictEqual(handledErrors[0].error, null);
            assert.strictEqual(handledErrors[1].error, undefined);
        });

        test('should handle empty operation string', () => {
            const command = new TestCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, '');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].context.operation, '');
        });

        test('should handle multiple errors sequentially', () => {
            const command = new TestCommand(mockContext);

            command.testHandleError(new Error('Error 1'), 'operation 1');
            command.testHandleError(new Error('Error 2'), 'operation 2');
            command.testHandleError(new Error('Error 3'), 'operation 3');

            assert.strictEqual(handledErrors.length, 3);
            assert.strictEqual(handledErrors[0].context.operation, 'operation 1');
            assert.strictEqual(handledErrors[1].context.operation, 'operation 2');
            assert.strictEqual(handledErrors[2].context.operation, 'operation 3');
        });

        test('should create proper ErrorContext structure', () => {
            const command = new TestCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, 'test operation');

            assert.strictEqual(handledErrors.length, 1);
            const context = handledErrors[0].context;

            assert.ok(context.hasOwnProperty('operation'));
            assert.ok(context.hasOwnProperty('component'));
            assert.strictEqual(typeof context.operation, 'string');
            assert.strictEqual(typeof context.component, 'string');
        });
    });

    suite('Abstract execute Method', () => {
        test('should require execute implementation', () => {
            const command = new TestCommand(mockContext);

            // Verify execute method exists
            assert.strictEqual(typeof command.execute, 'function');
        });

        test('should call execute with provided arguments', async () => {
            const command = new TestCommand(mockContext);

            await command.execute('arg1', 'arg2', 123);

            assert.strictEqual(command.executeCalled, true);
            assert.deepStrictEqual(command.executeArgs, ['arg1', 'arg2', 123]);
        });

        test('should handle execute with no arguments', async () => {
            const command = new TestCommand(mockContext);

            await command.execute();

            assert.strictEqual(command.executeCalled, true);
            assert.deepStrictEqual(command.executeArgs, []);
        });

        test('should handle async execute', async () => {
            class AsyncCommand extends BaseCommand {
                public result: string = '';

                async execute(): Promise<void> {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    this.result = 'completed';
                }
            }

            const command = new AsyncCommand(mockContext);
            await command.execute();

            assert.strictEqual(command.result, 'completed');
        });
    });

    suite('Integration Tests', () => {
        test('should use infrastructure components together', async () => {
            const command = new TestCommand(mockContext);

            // Verify all components are accessible
            const logger = command.getLogger();
            const config = command.getConfig();
            const storage = command.getStorage();

            assert.ok(logger);
            assert.ok(config);
            assert.ok(storage);

            // Verify they can be used
            logger.setLogLevel(0); // Should not throw
            const allConfig = config.getAll(); // Should not throw
            assert.ok(allConfig);
        });

        test('should handle errors during progress tasks', async () => {
            const command = new TestCommand(mockContext);
            const testError = new Error('Task failed');

            let errorHandled = false;
            const originalHandle = ErrorHandler.handle;
            (ErrorHandler as any).handle = () => {
                errorHandled = true;
            };

            try {
                await command.testWithProgress('Failing Task', async () => {
                    throw testError;
                });
            } catch (error) {
                // Error should propagate
                command.testHandleError(error, 'progress task');
            }

            ErrorHandler.handle = originalHandle;

            assert.strictEqual(errorHandled, true);
        });

        test('should maintain context across multiple operations', async () => {
            const command = new TestCommand(mockContext);

            // Perform multiple operations
            await command.testWithProgress('Operation 1', async () => {
                return 'result1';
            });

            command.testHandleError(new Error('Test'), 'operation 2');

            await command.execute('test');

            // Context should remain consistent
            assert.strictEqual(command.getContext(), mockContext);
            assert.ok(command.getLogger());
            assert.ok(command.getConfig());
            assert.ok(command.getStorage());
        });
    });
});
