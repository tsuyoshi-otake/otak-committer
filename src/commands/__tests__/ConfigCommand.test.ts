/**
 * Unit tests for ConfigCommand
 *
 * Tests language change, message style change, and configuration persistence.
 *
 * _Requirements: 7.1_
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigCommand } from '../ConfigCommand';
import { Logger } from '../../infrastructure/logging/Logger';
import { ConfigManager } from '../../infrastructure/config/ConfigManager';
import { StorageManager } from '../../infrastructure/storage/StorageManager';

/**
 * Testable ConfigCommand that exposes protected members
 */
class TestableConfigCommand extends ConfigCommand {
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

    public testHandleError(error: unknown, operation: string): void {
        this.handleErrorSilently(error, operation);
    }
}

suite('ConfigCommand Unit Tests', () => {
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        // Create mock extension context
        const secretStore = new Map<string, string>();
        const globalStore = new Map<string, any>();

        mockContext = {
            subscriptions: [],
            extensionPath: '/test/path',
            extensionUri: vscode.Uri.file('/test/path'),
            globalState: {
                get: <T>(key: string) => globalStore.get(key) as T,
                update: async (key: string, value: any) => {
                    if (value === undefined) {
                        globalStore.delete(key);
                    } else {
                        globalStore.set(key, value);
                    }
                },
                keys: () => Array.from(globalStore.keys()),
                setKeysForSync: () => {},
            } as any,
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => [],
            } as any,
            secrets: {
                get: async (key: string) => secretStore.get(key),
                store: async (key: string, value: string) => {
                    secretStore.set(key, value);
                },
                delete: async (key: string) => {
                    secretStore.delete(key);
                },
                onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
            } as any,
            extensionMode: vscode.ExtensionMode.Test,
            storageUri: vscode.Uri.file('/test/storage'),
            globalStorageUri: vscode.Uri.file('/test/global-storage'),
            logUri: vscode.Uri.file('/test/log'),
            asAbsolutePath: (relativePath: string) => `/test/path/${relativePath}`,
            storagePath: '/test/storage',
            globalStoragePath: '/test/global-storage',
            logPath: '/test/log',
        } as any;
    });

    suite('Command Initialization', () => {
        test('should create ConfigCommand instance', () => {
            const command = new TestableConfigCommand(mockContext);
            assert.ok(command);
        });

        test('should initialize with logger', () => {
            const command = new TestableConfigCommand(mockContext);
            const logger = command.getLogger();
            assert.ok(logger);
            assert.strictEqual(logger, Logger.getInstance());
        });

        test('should initialize with config manager', () => {
            const command = new TestableConfigCommand(mockContext);
            const config = command.getConfig();
            assert.ok(config);
            assert.ok(config instanceof ConfigManager);
        });

        test('should initialize with storage manager', () => {
            const command = new TestableConfigCommand(mockContext);
            const storage = command.getStorage();
            assert.ok(storage);
            assert.ok(storage instanceof StorageManager);
        });

        test('should have access to extension context', () => {
            const command = new TestableConfigCommand(mockContext);
            assert.strictEqual(command.getContext(), mockContext);
        });
    });

    suite('Command Methods', () => {
        test('should have changeLanguage method', () => {
            const command = new TestableConfigCommand(mockContext);
            assert.strictEqual(typeof command.changeLanguage, 'function');
        });

        test('should have changeMessageStyle method', () => {
            const command = new TestableConfigCommand(mockContext);
            assert.strictEqual(typeof command.changeMessageStyle, 'function');
        });

        test('should have execute method that throws', async () => {
            const command = new TestableConfigCommand(mockContext);

            // Execute should throw because ConfigCommand uses specific methods
            try {
                await command.execute();
                assert.fail('Execute should throw an error');
            } catch (error) {
                assert.ok(error instanceof Error);
                assert.ok((error as Error).message.includes('specific methods'));
            }
        });
    });

    suite('Change Language', () => {
        let quickPickItems: any[];
        let originalShowQuickPick: typeof vscode.window.showQuickPick;
        let originalShowInformationMessage: typeof vscode.window.showInformationMessage;

        setup(() => {
            quickPickItems = [];
            originalShowQuickPick = vscode.window.showQuickPick;
            originalShowInformationMessage = vscode.window.showInformationMessage;

            // Mock showQuickPick to capture items and return undefined
            (vscode.window as any).showQuickPick = async (items: any) => {
                quickPickItems = Array.isArray(items) ? items : [];
                return undefined; // User cancelled
            };

            // Mock showInformationMessage
            (vscode.window as any).showInformationMessage = () => Promise.resolve(undefined);
        });

        teardown(() => {
            (vscode.window as any).showQuickPick = originalShowQuickPick;
            (vscode.window as any).showInformationMessage = originalShowInformationMessage;
        });

        test('should show language selection when changeLanguage called', async () => {
            const command = new TestableConfigCommand(mockContext);
            await command.changeLanguage();

            // Should have called showQuickPick with language options
            assert.ok(quickPickItems.length > 0, 'Should show language options');
        });

        test('should handle user cancellation gracefully', async () => {
            const command = new TestableConfigCommand(mockContext);

            // Should not throw when user cancels
            await command.changeLanguage();
        });
    });

    suite('Change Message Style', () => {
        let quickPickItems: any[];
        let originalShowQuickPick: typeof vscode.window.showQuickPick;
        let originalShowInformationMessage: typeof vscode.window.showInformationMessage;

        setup(() => {
            quickPickItems = [];
            originalShowQuickPick = vscode.window.showQuickPick;
            originalShowInformationMessage = vscode.window.showInformationMessage;

            // Mock showQuickPick to capture items and return undefined
            (vscode.window as any).showQuickPick = async (items: any) => {
                quickPickItems = Array.isArray(items) ? items : [];
                return undefined; // User cancelled
            };

            // Mock showInformationMessage
            (vscode.window as any).showInformationMessage = () => Promise.resolve(undefined);
        });

        teardown(() => {
            (vscode.window as any).showQuickPick = originalShowQuickPick;
            (vscode.window as any).showInformationMessage = originalShowInformationMessage;
        });

        test('should show style selection when changeMessageStyle called', async () => {
            const command = new TestableConfigCommand(mockContext);
            await command.changeMessageStyle();

            // Should have called showQuickPick with style options
            assert.ok(quickPickItems.length > 0, 'Should show style options');
        });

        test('should include Simple, Normal, and Detailed options', async () => {
            const command = new TestableConfigCommand(mockContext);
            await command.changeMessageStyle();

            const labels = quickPickItems.map((item: any) => item.label);
            assert.ok(labels.includes('Simple'), 'Should include Simple option');
            assert.ok(labels.includes('Normal'), 'Should include Normal option');
            assert.ok(labels.includes('Detailed'), 'Should include Detailed option');
        });

        test('should handle user cancellation gracefully', async () => {
            const command = new TestableConfigCommand(mockContext);

            // Should not throw when user cancels
            await command.changeMessageStyle();
        });
    });

    suite('Error Handling', () => {
        let handledErrors: Array<{ error: unknown; context: any }>;
        let originalHandle: any;

        setup(() => {
            handledErrors = [];

            // Mock ErrorHandler.handle
            const ErrorHandler = require('../../infrastructure/error/ErrorHandler').ErrorHandler;
            originalHandle = ErrorHandler.handle;
            (ErrorHandler as any).handle = (error: unknown, context: any) => {
                handledErrors.push({ error, context });
            };
        });

        teardown(() => {
            const ErrorHandler = require('../../infrastructure/error/ErrorHandler').ErrorHandler;
            ErrorHandler.handle = originalHandle;
        });

        test('should route errors through ErrorHandler', () => {
            const command = new TestableConfigCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, 'test operation');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].error, testError);
        });

        test('should include command name in error context', () => {
            const command = new TestableConfigCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, 'test operation');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].context.component, 'TestableConfigCommand');
        });
    });

    suite('Type Safety', () => {
        test('should extend BaseCommand', () => {
            const command = new TestableConfigCommand(mockContext);
            const BaseCommand = require('../BaseCommand').BaseCommand;
            assert.ok(command instanceof BaseCommand);
        });

        test('should implement required interface', () => {
            const command = new TestableConfigCommand(mockContext);

            // Check all expected methods exist
            assert.strictEqual(typeof command.changeLanguage, 'function');
            assert.strictEqual(typeof command.changeMessageStyle, 'function');
            assert.ok(command.getLogger());
            assert.ok(command.getConfig());
        });
    });
});
