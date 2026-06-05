/**
 * Integration tests for extension activation
 *
 * Tests the extension activation flow, command registration,
 * and infrastructure initialization.
 *
 * _Requirements: 7.1_
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Tests', () => {
    suite('Extension Activation', () => {
        test('extension should be present', () => {
            const extension = vscode.extensions.getExtension(
                'odangoo.otak-committer',
            );
            assert.ok(extension, 'Extension otak-committer should be registered');
        });

        test('extension should activate without errors', async () => {
            const extension = vscode.extensions.getExtension(
                'odangoo.otak-committer',
            );
            assert.ok(extension, 'Extension otak-committer should be registered');
            await extension.activate();
            assert.strictEqual(
                extension.isActive,
                true,
                'Extension should be active after activation',
            );
        });
    });

    suite('Command Registration', () => {
        test('generateMessage command should be registered', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('otak-committer.generateMessage'),
                'otak-committer.generateMessage should be registered',
            );
        });

        test('generatePR command should be registered', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('otak-committer.generatePR'),
                'otak-committer.generatePR should be registered',
            );
        });

        test('generateIssue command should be registered', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('otak-committer.generateIssue'),
                'otak-committer.generateIssue should be registered',
            );
        });

        test('openSettings command should be registered', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('otak-committer.openSettings'),
                'otak-committer.openSettings should be registered',
            );
        });

        test('changeLanguage command should be registered', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('otak-committer.changeLanguage'),
                'otak-committer.changeLanguage should be registered',
            );
        });

        test('changeMessageStyle command should be registered', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('otak-committer.changeMessageStyle'),
                'otak-committer.changeMessageStyle should be registered',
            );
        });

        test('setApiKey command should be registered', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('otak-committer.setApiKey'),
                'otak-committer.setApiKey should be registered',
            );
        });

        test('diagnoseStorage command should be registered', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('otak-committer.diagnoseStorage'),
                'otak-committer.diagnoseStorage should be registered',
            );
        });
    });

    suite('Infrastructure Initialization', () => {
        test('Logger should be accessible as singleton', () => {
            const { Logger } = require('../../infrastructure/logging/Logger');
            const logger1 = Logger.getInstance();
            const logger2 = Logger.getInstance();

            assert.ok(logger1, 'Logger instance should exist');
            assert.strictEqual(logger1, logger2, 'Logger should be singleton');
        });

        test('ConfigManager should be instantiable', () => {
            const { ConfigManager } = require('../../infrastructure/config/ConfigManager');
            const config = new ConfigManager();

            assert.ok(config, 'ConfigManager should be instantiable');
            assert.strictEqual(
                typeof config.get,
                'function',
                'ConfigManager should have get method',
            );
            assert.strictEqual(
                typeof config.set,
                'function',
                'ConfigManager should have set method',
            );
        });

        test('ErrorHandler should be available', () => {
            const { ErrorHandler } = require('../../infrastructure/error/ErrorHandler');

            assert.ok(ErrorHandler, 'ErrorHandler should be available');
            assert.strictEqual(
                typeof ErrorHandler.handle,
                'function',
                'ErrorHandler should have handle method',
            );
        });

        test('StorageManager should be instantiable with mock context', () => {
            const { StorageManager } = require('../../infrastructure/storage/StorageManager');

            const mockContext = {
                secrets: {
                    get: async () => undefined,
                    store: async () => {},
                    delete: async () => {},
                    onDidChange: new vscode.EventEmitter().event,
                },
                globalState: {
                    get: () => undefined,
                    update: async () => {},
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            };

            const storage = new StorageManager(mockContext as any);
            assert.ok(storage, 'StorageManager should be instantiable');
        });
    });

    suite('Command Classes', () => {
        let mockContext: vscode.ExtensionContext;

        setup(() => {
            mockContext = {
                subscriptions: [],
                extensionPath: '/test/path',
                extensionUri: vscode.Uri.file('/test/path'),
                globalState: {
                    get: () => undefined,
                    update: async () => {},
                    keys: () => [],
                    setKeysForSync: () => {},
                } as any,
                workspaceState: {
                    get: () => undefined,
                    update: async () => {},
                    keys: () => [],
                } as any,
                secrets: {
                    get: async () => undefined,
                    store: async () => {},
                    delete: async () => {},
                    onDidChange: new vscode.EventEmitter().event,
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

        test('CommitCommand should be instantiable', () => {
            const { CommitCommand } = require('../../commands/CommitCommand');
            const command = new CommitCommand(mockContext);
            assert.ok(command, 'CommitCommand should be instantiable');
        });

        test('PRCommand should be instantiable', () => {
            const { PRCommand } = require('../../commands/PRCommand');
            const command = new PRCommand(mockContext);
            assert.ok(command, 'PRCommand should be instantiable');
        });

        test('IssueCommand should be instantiable', () => {
            const { IssueCommand } = require('../../commands/IssueCommand');
            const command = new IssueCommand(mockContext);
            assert.ok(command, 'IssueCommand should be instantiable');
        });

        test('ConfigCommand should be instantiable', () => {
            const { ConfigCommand } = require('../../commands/ConfigCommand');
            const command = new ConfigCommand(mockContext);
            assert.ok(command, 'ConfigCommand should be instantiable');
        });

        test('CommandRegistry should be instantiable', () => {
            const { CommandRegistry } = require('../../commands/CommandRegistry');
            const registry = new CommandRegistry();
            assert.ok(registry, 'CommandRegistry should be instantiable');
        });
    });

    suite('Type System', () => {
        test('Error types should be importable', () => {
            const errors = require('../../types/errors');

            assert.ok(errors.BaseError, 'BaseError should be exported');
            assert.ok(errors.ValidationError, 'ValidationError should be exported');
            assert.ok(errors.ServiceError, 'ServiceError should be exported');
            assert.ok(errors.StorageError, 'StorageError should be exported');
            assert.ok(errors.CommandError, 'CommandError should be exported');
            assert.ok(errors.CriticalError, 'CriticalError should be exported');
        });

        test('Enums should be importable', () => {
            const MessageStyle = require('../../types/enums/MessageStyle');
            const SupportedLanguage = require('../../types/enums/SupportedLanguage');

            assert.ok(MessageStyle, 'MessageStyle should be exported');
            assert.ok(SupportedLanguage, 'SupportedLanguage should be exported');
        });
    });
});
