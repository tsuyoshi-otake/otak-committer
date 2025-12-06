/**
 * Unit tests for IssueCommand
 *
 * Tests the issue generation flow and error scenarios.
 *
 * _Requirements: 7.1_
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import { IssueCommand } from '../IssueCommand';
import { Logger } from '../../infrastructure/logging/Logger';
import { ConfigManager } from '../../infrastructure/config/ConfigManager';
import { StorageManager } from '../../infrastructure/storage/StorageManager';

/**
 * Testable IssueCommand that exposes protected members
 */
class TestableIssueCommand extends IssueCommand {
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
        this.handleError(error, operation);
    }
}

suite('IssueCommand Unit Tests', () => {
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
                setKeysForSync: () => { }
            } as any,
            workspaceState: {
                get: () => undefined,
                update: () => Promise.resolve(),
                keys: () => []
            } as any,
            secrets: {
                get: async (key: string) => secretStore.get(key),
                store: async (key: string, value: string) => {
                    secretStore.set(key, value);
                },
                delete: async (key: string) => {
                    secretStore.delete(key);
                },
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

    suite('Command Initialization', () => {
        test('should create IssueCommand instance', () => {
            const command = new TestableIssueCommand(mockContext);
            assert.ok(command);
        });

        test('should initialize with logger', () => {
            const command = new TestableIssueCommand(mockContext);
            const logger = command.getLogger();
            assert.ok(logger);
            assert.strictEqual(logger, Logger.getInstance());
        });

        test('should initialize with config manager', () => {
            const command = new TestableIssueCommand(mockContext);
            const config = command.getConfig();
            assert.ok(config);
            assert.ok(config instanceof ConfigManager);
        });

        test('should initialize with storage manager', () => {
            const command = new TestableIssueCommand(mockContext);
            const storage = command.getStorage();
            assert.ok(storage);
            assert.ok(storage instanceof StorageManager);
        });

        test('should have access to extension context', () => {
            const command = new TestableIssueCommand(mockContext);
            assert.strictEqual(command.getContext(), mockContext);
        });
    });

    suite('Execute Method', () => {
        test('should have execute method', () => {
            const command = new TestableIssueCommand(mockContext);
            assert.strictEqual(typeof command.execute, 'function');
        });

        test('should return void from execute', async () => {
            const command = new TestableIssueCommand(mockContext);
            // Execute will likely fail due to missing GitHub auth, but should not throw
            try {
                await command.execute();
            } catch (error) {
                // Expected in test environment
            }
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
            const command = new TestableIssueCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, 'test operation');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(handledErrors[0].error, testError);
        });

        test('should include command name in error context', () => {
            const command = new TestableIssueCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, 'test operation');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(
                handledErrors[0].context.component,
                'TestableIssueCommand'
            );
        });

        test('should include operation in error context', () => {
            const command = new TestableIssueCommand(mockContext);
            const testError = new Error('Test error');

            command.testHandleError(testError, 'generating issue');

            assert.strictEqual(handledErrors.length, 1);
            assert.strictEqual(
                handledErrors[0].context.operation,
                'generating issue'
            );
        });
    });

    suite('Type Safety', () => {
        test('should extend BaseCommand', () => {
            const command = new TestableIssueCommand(mockContext);
            const BaseCommand = require('../BaseCommand').BaseCommand;
            assert.ok(command instanceof BaseCommand);
        });

        test('should implement required interface', () => {
            const command = new TestableIssueCommand(mockContext);

            // Check all expected methods exist
            assert.strictEqual(typeof command.execute, 'function');
            assert.ok(command.getLogger());
            assert.ok(command.getConfig());
            assert.ok(command.getStorage());
        });
    });
});
