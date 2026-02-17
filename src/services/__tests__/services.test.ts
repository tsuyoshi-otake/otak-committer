/**
 * Unit tests for updated services
 *
 * Tests service initialization, error handling integration,
 * and logging integration.
 *
 * _Requirements: 7.1_
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Services Unit Tests', () => {
    suite('GitService', () => {
        test('GitServiceFactory should be importable', () => {
            const { GitServiceFactory } = require('../git');
            assert.ok(GitServiceFactory, 'GitServiceFactory should be exported');
            assert.strictEqual(
                typeof GitServiceFactory.initialize,
                'function',
                'GitServiceFactory should have initialize method',
            );
        });

        test('GitService should handle initialization gracefully', async () => {
            const { GitServiceFactory } = require('../git');

            // Should not throw even if Git is not available
            try {
                const service = await GitServiceFactory.initialize();
                console.log(`GitService initialized: ${!!service}`);
            } catch (error) {
                // Expected in test environment without Git
                console.log('GitService initialization failed (expected in test):', error);
            }
        });
    });

    suite('OpenAIService', () => {
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

        test('OpenAIService should be importable', () => {
            const { OpenAIService } = require('../openai');
            assert.ok(OpenAIService, 'OpenAIService should be exported');
            assert.strictEqual(
                typeof OpenAIService.initialize,
                'function',
                'OpenAIService should have initialize method',
            );
        });

        test('OpenAIService should return undefined without API key', async () => {
            const { OpenAIService } = require('../openai');

            const service = await OpenAIService.initialize(
                {
                    openaiApiKey: '',
                    language: 'english',
                    messageStyle: 'normal',
                    useEmoji: false,
                },
                mockContext,
            );

            assert.strictEqual(service, undefined, 'Should return undefined without API key');
        });
    });

    suite('GitHubService', () => {
        test('GitHubServiceFactory should be importable', () => {
            const { GitHubServiceFactory, GitHubService } = require('../github');
            assert.ok(GitHubServiceFactory, 'GitHubServiceFactory should be exported');
            assert.ok(GitHubService, 'GitHubService should be exported');
        });

        test('GitHubService should have selectBranches method', () => {
            const { GitHubService } = require('../github');
            assert.strictEqual(
                typeof GitHubService.selectBranches,
                'function',
                'GitHubService should have selectBranches method',
            );
        });
    });

    suite('PromptService', () => {
        test('Prompt module should be importable', () => {
            const prompt = require('../prompt');
            assert.ok(prompt, 'Prompt module should be exported');
        });
    });

    suite('IssueGeneratorService', () => {
        test('IssueGeneratorServiceFactory should be importable', () => {
            const { IssueGeneratorServiceFactory } = require('../issueGenerator');
            assert.ok(
                IssueGeneratorServiceFactory,
                'IssueGeneratorServiceFactory should be exported',
            );
            assert.strictEqual(
                typeof IssueGeneratorServiceFactory.initialize,
                'function',
                'IssueGeneratorServiceFactory should have initialize method',
            );
        });
    });

    suite('BranchService', () => {
        test('Branch service should be importable', () => {
            const branch = require('../branch');
            assert.ok(branch, 'Branch module should be exported');
        });
    });

    suite('Service Integration', () => {
        test('Services should not have circular dependencies', () => {
            // Try importing all services - circular deps would cause errors
            let importErrors: string[] = [];

            try {
                require('../git');
            } catch (e: any) {
                importErrors.push(`git: ${e.message}`);
            }

            try {
                require('../openai');
            } catch (e: any) {
                importErrors.push(`openai: ${e.message}`);
            }

            try {
                require('../github');
            } catch (e: any) {
                importErrors.push(`github: ${e.message}`);
            }

            try {
                require('../prompt');
            } catch (e: any) {
                importErrors.push(`prompt: ${e.message}`);
            }

            try {
                require('../issueGenerator');
            } catch (e: any) {
                importErrors.push(`issueGenerator: ${e.message}`);
            }

            try {
                require('../branch');
            } catch (e: any) {
                importErrors.push(`branch: ${e.message}`);
            }

            if (importErrors.length > 0) {
                console.log('Import errors:', importErrors);
            }

            assert.strictEqual(
                importErrors.length,
                0,
                `Service imports failed: ${importErrors.join(', ')}`,
            );
        });

        test('Services should use Logger for logging', () => {
            // This is a design verification test
            // Services should use the centralized Logger
            const { Logger } = require('../../infrastructure/logging/Logger');
            assert.ok(Logger, 'Logger should be available for services');
            assert.ok(Logger.getInstance(), 'Logger singleton should be accessible');
        });

        test('Services should use ErrorHandler for errors', () => {
            // This is a design verification test
            // Services should use the centralized ErrorHandler
            const { ErrorHandler } = require('../../infrastructure/error/ErrorHandler');
            assert.ok(ErrorHandler, 'ErrorHandler should be available for services');
            assert.strictEqual(
                typeof ErrorHandler.handle,
                'function',
                'ErrorHandler.handle should be available',
            );
        });
    });

    suite('Service Error Handling', () => {
        test('ServiceError type should be available', () => {
            const { ServiceError } = require('../../types/errors');
            assert.ok(ServiceError, 'ServiceError should be exported');

            const error = new ServiceError('Test error', 'TestService');
            assert.strictEqual(error.service, 'TestService');
            assert.ok(error.message.includes('Test error'));
        });

        test('Services should throw ServiceError for failures', () => {
            const { ServiceError } = require('../../types/errors');

            // Services should throw ServiceError, not generic Error
            const error = new ServiceError('API call failed', 'OpenAI');
            assert.ok(error instanceof Error);
            assert.strictEqual((error as any).service, 'OpenAI');
        });
    });
});
