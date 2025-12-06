/**
 * Unit tests for CommandRegistry
 * 
 * Tests command registration, command execution with error handling,
 * and multiple command registration.
 * 
 * _Requirements: 7.1_
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommandRegistry, Command } from '../CommandRegistry';
import { ErrorHandler } from '../../infrastructure/error/ErrorHandler';

suite('CommandRegistry Unit Tests', () => {
    let registry: CommandRegistry;
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
            onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
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
            setKeysForSync: (keys: readonly string[]) => { }
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
            setKeysForSync: (keys: readonly string[]) => { }
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
            languageModelAccessInformation: {} as any
        } as unknown as vscode.ExtensionContext;

        // Create new registry for each test
        registry = new CommandRegistry();
    });

    suite('Command Registration', () => {
        test('should register a single command', () => {
            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: async () => { }
            };

            registry.register(command);

            assert.strictEqual(registry.getCommandCount(), 1);
            assert.strictEqual(registry.hasCommand('test.command'), true);
        });

        test('should register command with category', () => {
            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                category: 'Test Category',
                handler: async () => { }
            };

            registry.register(command);

            assert.strictEqual(registry.hasCommand('test.command'), true);
        });

        test('should throw error when registering duplicate command ID', () => {
            const command1: Command = {
                id: 'test.command',
                title: 'Test Command 1',
                handler: async () => { }
            };

            const command2: Command = {
                id: 'test.command',
                title: 'Test Command 2',
                handler: async () => { }
            };

            registry.register(command1);

            assert.throws(
                () => registry.register(command2),
                /already registered/
            );
        });

        test('should allow registering commands with different IDs', () => {
            const command1: Command = {
                id: 'test.command1',
                title: 'Test Command 1',
                handler: async () => { }
            };

            const command2: Command = {
                id: 'test.command2',
                title: 'Test Command 2',
                handler: async () => { }
            };

            registry.register(command1);
            registry.register(command2);

            assert.strictEqual(registry.getCommandCount(), 2);
            assert.strictEqual(registry.hasCommand('test.command1'), true);
            assert.strictEqual(registry.hasCommand('test.command2'), true);
        });

        test('should track command count correctly', () => {
            assert.strictEqual(registry.getCommandCount(), 0);

            registry.register({
                id: 'test.command1',
                title: 'Test Command 1',
                handler: async () => { }
            });

            assert.strictEqual(registry.getCommandCount(), 1);

            registry.register({
                id: 'test.command2',
                title: 'Test Command 2',
                handler: async () => { }
            });

            assert.strictEqual(registry.getCommandCount(), 2);
        });

        test('should return false for non-existent command', () => {
            assert.strictEqual(registry.hasCommand('non.existent'), false);
        });

        test('should return all registered command IDs', () => {
            registry.register({
                id: 'test.command1',
                title: 'Test Command 1',
                handler: async () => { }
            });

            registry.register({
                id: 'test.command2',
                title: 'Test Command 2',
                handler: async () => { }
            });

            const commandIds = registry.getCommandIds();

            assert.strictEqual(commandIds.length, 2);
            assert.ok(commandIds.includes('test.command1'));
            assert.ok(commandIds.includes('test.command2'));
        });

        test('should return empty array when no commands registered', () => {
            const commandIds = registry.getCommandIds();

            assert.strictEqual(commandIds.length, 0);
            assert.ok(Array.isArray(commandIds));
        });
    });

    suite('Multiple Command Registration', () => {
        test('should register multiple commands', () => {
            const commands: Command[] = [
                {
                    id: 'test.command1',
                    title: 'Test Command 1',
                    handler: async () => { }
                },
                {
                    id: 'test.command2',
                    title: 'Test Command 2',
                    handler: async () => { }
                },
                {
                    id: 'test.command3',
                    title: 'Test Command 3',
                    handler: async () => { }
                }
            ];

            commands.forEach(cmd => registry.register(cmd));

            assert.strictEqual(registry.getCommandCount(), 3);
            commands.forEach(cmd => {
                assert.strictEqual(registry.hasCommand(cmd.id), true);
            });
        });

        test('should handle registering many commands', () => {
            const commandCount = 50;

            for (let i = 0; i < commandCount; i++) {
                registry.register({
                    id: `test.command${i}`,
                    title: `Test Command ${i}`,
                    handler: async () => { }
                });
            }

            assert.strictEqual(registry.getCommandCount(), commandCount);
        });

        test('should maintain command order in getCommandIds', () => {
            const commandIds = ['test.command1', 'test.command2', 'test.command3'];

            commandIds.forEach(id => {
                registry.register({
                    id,
                    title: `Title for ${id}`,
                    handler: async () => { }
                });
            });

            const retrievedIds = registry.getCommandIds();

            assert.strictEqual(retrievedIds.length, commandIds.length);
            commandIds.forEach(id => {
                assert.ok(retrievedIds.includes(id));
            });
        });
    });

    suite('Command Execution with Error Handling', () => {
        let registeredCommands: Map<string, (...args: any[]) => any>;
        let originalRegisterCommand: any;
        let handledErrors: Array<{ error: unknown; context: any }>;
        let originalErrorHandle: any;

        setup(() => {
            registeredCommands = new Map();
            handledErrors = [];

            // Mock vscode.commands.registerCommand
            originalRegisterCommand = vscode.commands.registerCommand;
            (vscode.commands as any).registerCommand = (id: string, handler: (...args: any[]) => any) => {
                registeredCommands.set(id, handler);
                return { dispose: () => { } };
            };

            // Mock ErrorHandler.handle
            originalErrorHandle = ErrorHandler.handle;
            (ErrorHandler as any).handle = (error: unknown, context: any) => {
                handledErrors.push({ error, context });
            };
        });

        teardown(() => {
            vscode.commands.registerCommand = originalRegisterCommand;
            ErrorHandler.handle = originalErrorHandle;
            registeredCommands.clear();
            handledErrors = [];
        });

        test('should register commands with VS Code', () => {
            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: async () => { }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            assert.strictEqual(registeredCommands.has('test.command'), true);
        });

        test('should execute command handler when invoked', async () => {
            let executed = false;

            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: async () => {
                    executed = true;
                }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            const handler = registeredCommands.get('test.command');
            assert.ok(handler);

            await handler();

            assert.strictEqual(executed, true);
        });

        test('should pass arguments to command handler', async () => {
            let receivedArgs: any[] = [];

            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: async (...args: any[]) => {
                    receivedArgs = args;
                }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            const handler = registeredCommands.get('test.command');
            assert.ok(handler);

            await handler('arg1', 'arg2', 123);

            assert.deepStrictEqual(receivedArgs, ['arg1', 'arg2', 123]);
        });

        test('should handle errors through ErrorHandler', async () => {
            const testError = new Error('Command failed');

            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: async () => {
                    throw testError;
                }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            const handler = registeredCommands.get('test.command');
            assert.ok(handler);

            await handler();

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].error, testError);
        });

        test('should include command metadata in error context', async () => {
            const testError = new Error('Command failed');

            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                category: 'Test Category',
                handler: async () => {
                    throw testError;
                }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            const handler = registeredCommands.get('test.command');
            assert.ok(handler);

            await handler();

            assert.strictEqual(handledErrors.length, 1);
            const context = handledErrors[0].context;

            assert.ok(context.operation.includes('Test Command'));
            assert.strictEqual(context.component, 'CommandRegistry');
            assert.strictEqual(context.metadata.commandId, 'test.command');
            assert.strictEqual(context.metadata.commandTitle, 'Test Command');
            assert.strictEqual(context.metadata.commandCategory, 'Test Category');
        });

        test('should not throw when command handler throws', async () => {
            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: async () => {
                    throw new Error('Command failed');
                }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            const handler = registeredCommands.get('test.command');
            assert.ok(handler);

            // Should not throw - error should be handled internally
            await handler();

            assert.strictEqual(handledErrors.length, 1);
        });

        test('should handle synchronous command handlers', async () => {
            let executed = false;

            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: () => {
                    executed = true;
                }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            const handler = registeredCommands.get('test.command');
            assert.ok(handler);

            await handler();

            assert.strictEqual(executed, true);
        });

        test('should handle errors in synchronous handlers', async () => {
            const testError = new Error('Sync command failed');

            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: () => {
                    throw testError;
                }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            const handler = registeredCommands.get('test.command');
            assert.ok(handler);

            await handler();

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].error, testError);
        });

        test('should add disposables to context subscriptions', () => {
            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: async () => { }
            };

            registry.register(command);

            const initialSubscriptionCount = mockContext.subscriptions.length;

            registry.registerAll(mockContext);

            assert.strictEqual(mockContext.subscriptions.length, initialSubscriptionCount + 1);
        });

        test('should register all commands with VS Code', () => {
            const commands: Command[] = [
                {
                    id: 'test.command1',
                    title: 'Test Command 1',
                    handler: async () => { }
                },
                {
                    id: 'test.command2',
                    title: 'Test Command 2',
                    handler: async () => { }
                },
                {
                    id: 'test.command3',
                    title: 'Test Command 3',
                    handler: async () => { }
                }
            ];

            commands.forEach(cmd => registry.register(cmd));
            registry.registerAll(mockContext);

            assert.strictEqual(registeredCommands.size, 3);
            commands.forEach(cmd => {
                assert.strictEqual(registeredCommands.has(cmd.id), true);
            });
        });

        test('should handle multiple command executions', async () => {
            let executionCount = 0;

            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: async () => {
                    executionCount++;
                }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            const handler = registeredCommands.get('test.command');
            assert.ok(handler);

            await handler();
            await handler();
            await handler();

            assert.strictEqual(executionCount, 3);
        });

        test('should handle errors in multiple command executions', async () => {
            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                handler: async () => {
                    throw new Error('Command failed');
                }
            };

            registry.register(command);
            registry.registerAll(mockContext);

            const handler = registeredCommands.get('test.command');
            assert.ok(handler);

            await handler();
            await handler();

            assert.strictEqual(handledErrors.length, 2);
        });

        test('should handle different error types', async () => {
            const commands: Command[] = [
                {
                    id: 'test.error1',
                    title: 'Error Command 1',
                    handler: async () => {
                        throw new Error('Standard error');
                    }
                },
                {
                    id: 'test.error2',
                    title: 'Error Command 2',
                    handler: async () => {
                        throw new TypeError('Type error');
                    }
                },
                {
                    id: 'test.error3',
                    title: 'Error Command 3',
                    handler: async () => {
                        throw 'String error';
                    }
                }
            ];

            commands.forEach(cmd => registry.register(cmd));
            registry.registerAll(mockContext);

            for (const cmd of commands) {
                const handler = registeredCommands.get(cmd.id);
                assert.ok(handler);
                await handler();
            }

            assert.strictEqual(handledErrors.length, 3);
        });
    });

    suite('Integration Tests', () => {
        test('should support complete command lifecycle', async () => {
            let executed = false;
            let registeredCommands: Map<string, (...args: any[]) => any> = new Map();

            const originalRegisterCommand = vscode.commands.registerCommand;
            (vscode.commands as any).registerCommand = (id: string, handler: (...args: any[]) => any) => {
                registeredCommands.set(id, handler);
                return { dispose: () => { } };
            };

            const command: Command = {
                id: 'test.command',
                title: 'Test Command',
                category: 'Test',
                handler: async () => {
                    executed = true;
                }
            };

            // Register
            registry.register(command);
            assert.strictEqual(registry.hasCommand('test.command'), true);

            // Register with VS Code
            registry.registerAll(mockContext);
            assert.strictEqual(registeredCommands.has('test.command'), true);

            // Execute
            const handler = registeredCommands.get('test.command');
            assert.ok(handler);
            await handler();

            assert.strictEqual(executed, true);

            vscode.commands.registerCommand = originalRegisterCommand;
        });

        test('should handle empty registry', () => {
            assert.strictEqual(registry.getCommandCount(), 0);
            assert.strictEqual(registry.getCommandIds().length, 0);

            // Should not throw
            registry.registerAll(mockContext);

            assert.strictEqual(mockContext.subscriptions.length, 0);
        });
    });
});
