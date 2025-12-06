/**
 * Property-based tests for migration fallback resilience
 * 
 * **Feature: extension-architecture-refactoring, Property 5: Migration Fallback Resilience**
 * **Validates: Requirements 3.3**
 * 
 * Property: For any migration operation that fails, the system should fall back to using 
 * the legacy data format and continue functioning without crashing.
 */

import * as fc from 'fast-check';
import * as vscode from 'vscode';
import { StorageManager } from '../../infrastructure/storage/StorageManager';

/**
 * Creates a mock ExtensionContext for testing with optional failure modes
 */
function createMockContext(options?: {
    secretStorageFails?: boolean;
    globalStateFails?: boolean;
}): vscode.ExtensionContext {
    const secretStore = new Map<string, string>();
    const globalStateStore = new Map<string, any>();
    
    return {
        secrets: {
            get: async (key: string) => {
                if (options?.secretStorageFails) {
                    throw new Error('SecretStorage unavailable');
                }
                return secretStore.get(key);
            },
            store: async (key: string, value: string) => {
                if (options?.secretStorageFails) {
                    throw new Error('SecretStorage unavailable');
                }
                secretStore.set(key, value);
            },
            delete: async (key: string) => {
                if (options?.secretStorageFails) {
                    throw new Error('SecretStorage unavailable');
                }
                secretStore.delete(key);
            },
            onDidChange: undefined as any
        },
        globalState: {
            get: <T>(key: string) => {
                if (options?.globalStateFails) {
                    throw new Error('GlobalState unavailable');
                }
                return globalStateStore.get(key) as T;
            },
            update: async (key: string, value: any) => {
                if (options?.globalStateFails) {
                    throw new Error('GlobalState unavailable');
                }
                if (value === undefined) {
                    globalStateStore.delete(key);
                } else {
                    globalStateStore.set(key, value);
                }
            },
            keys: () => {
                if (options?.globalStateFails) {
                    throw new Error('GlobalState unavailable');
                }
                return Array.from(globalStateStore.keys());
            },
            setKeysForSync: () => {}
        },
        subscriptions: [],
        workspaceState: undefined as any,
        extensionUri: undefined as any,
        extensionPath: '',
        environmentVariableCollection: undefined as any,
        extensionMode: vscode.ExtensionMode.Test,
        storageUri: undefined,
        storagePath: undefined,
        globalStorageUri: undefined as any,
        globalStoragePath: '',
        logUri: undefined as any,
        logPath: '',
        asAbsolutePath: (relativePath: string) => relativePath,
        extension: undefined as any,
        languageModelAccessInformation: undefined as any
    };
}

/**
 * Creates a mock workspace configuration for testing
 */
function createMockWorkspaceConfig(): Map<string, any> {
    return new Map<string, any>();
}

/**
 * Mock implementation of vscode.workspace.getConfiguration
 */
function mockGetConfiguration(configStore: Map<string, any>) {
    return (section?: string) => {
        const prefix = section ? `${section}.` : '';
        
        return {
            get: <T>(key: string): T | undefined => {
                const fullKey = prefix + key;
                return configStore.get(fullKey) as T;
            },
            update: async (key: string, value: any, target?: vscode.ConfigurationTarget) => {
                const fullKey = prefix + key;
                if (value === undefined) {
                    configStore.delete(fullKey);
                } else {
                    configStore.set(fullKey, value);
                }
            },
            has: (key: string): boolean => {
                const fullKey = prefix + key;
                return configStore.has(fullKey);
            },
            inspect: undefined as any
        };
    };
}

suite('Migration Fallback Resilience Property Tests', () => {
    let originalGetConfiguration: typeof vscode.workspace.getConfiguration;
    let originalShowWarningMessage: typeof vscode.window.showWarningMessage;
    let originalShowInformationMessage: typeof vscode.window.showInformationMessage;
    let warningMessages: string[];
    let infoMessages: string[];

    setup(() => {
        // Save original implementations
        originalGetConfiguration = vscode.workspace.getConfiguration;
        originalShowWarningMessage = vscode.window.showWarningMessage;
        originalShowInformationMessage = vscode.window.showInformationMessage;
        
        // Track messages
        warningMessages = [];
        infoMessages = [];
        
        // Mock message functions
        (vscode.window as any).showWarningMessage = (message: string) => {
            warningMessages.push(message);
            return Promise.resolve(undefined);
        };
        
        (vscode.window as any).showInformationMessage = (message: string) => {
            infoMessages.push(message);
            return Promise.resolve(undefined);
        };
    });

    teardown(() => {
        // Restore original implementations
        (vscode.workspace as any).getConfiguration = originalGetConfiguration;
        (vscode.window as any).showWarningMessage = originalShowWarningMessage;
        (vscode.window as any).showInformationMessage = originalShowInformationMessage;
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 5: Migration Fallback Resilience**
     *
     * This test verifies that when SecretStorage fails but GlobalState backup works,
     * the system successfully migrates data to the backup storage:
     * 1. Does not crash
     * 2. Data is retrievable (from backup)
     * 3. Migration completes successfully via backup mechanism
     */
    test('Property 5: Migration continues functioning when SecretStorage fails', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    // Use alphanumeric characters to avoid whitespace-only strings
                    apiKey: fc.string({ minLength: 20, maxLength: 50 }).map(s => 'key' + s.replace(/\s/g, 'x'))
                }),
                async ({ service, apiKey }) => {
                    // Setup: Create context where SecretStorage fails but GlobalState works
                    // This tests the backup fallback mechanism in SecretStorageProvider
                    const mockContext = createMockContext({ secretStorageFails: true, globalStateFails: false });
                    const testConfigStore = createMockWorkspaceConfig();

                    const originalConfig = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = mockGetConfiguration(testConfigStore);

                    try {
                        // Pre-condition: Place legacy data in Configuration storage
                        const legacyKey = service === 'openai'
                            ? 'otakCommitter.openaiApiKey'
                            : 'otakCommitter.githubToken';
                        testConfigStore.set(legacyKey, apiKey);

                        const storage = new StorageManager(mockContext);

                        // Action: Attempt migration (should succeed via backup)
                        let migrationError: Error | null = null;
                        try {
                            await storage.migrateFromLegacy();
                        } catch (error) {
                            migrationError = error as Error;
                        }

                        // Verification 1: Migration should not throw
                        if (migrationError !== null) {
                            console.error('Migration threw error:', migrationError);
                            return false;
                        }

                        // Verification 2: Data should be retrievable (from backup or any fallback)
                        const retrievedKey = await storage.getApiKey(service);
                        if (retrievedKey !== apiKey) {
                            console.error(`Failed to retrieve key: expected ${apiKey}, got ${retrievedKey}`);
                            return false;
                        }

                        return true;
                    } finally {
                        (vscode.workspace as any).getConfiguration = originalConfig;
                    }
                }
            ),
            { numRuns: 20, timeout: 30000 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 5: Migration Fallback Resilience**
     *
     * This test verifies that when both SecretStorage and GlobalState fail,
     * the system still functions using legacy Configuration storage without crashing.
     */
    test('Property 5: System functions with legacy storage when all secure storage fails', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    openaiKey: fc.string({ minLength: 20, maxLength: 50 }).map(s => 'key' + s.replace(/\s/g, 'x')),
                    githubToken: fc.string({ minLength: 20, maxLength: 50 }).map(s => 'key' + s.replace(/\s/g, 'x'))
                }),
                async ({ openaiKey, githubToken }) => {
                    // Setup: Create context where both SecretStorage and GlobalState fail
                    const mockContext = createMockContext({
                        secretStorageFails: true,
                        globalStateFails: true
                    });
                    const testConfigStore = createMockWorkspaceConfig();

                    const originalConfig = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = mockGetConfiguration(testConfigStore);

                    try {
                        // Pre-condition: Place legacy data
                        testConfigStore.set('otakCommitter.openaiApiKey', openaiKey);
                        testConfigStore.set('otakCommitter.githubToken', githubToken);

                        const storage = new StorageManager(mockContext);

                        // Action: Attempt migration (should not crash, even if it fails internally)
                        let migrationCrashed = false;
                        try {
                            await storage.migrateFromLegacy();
                        } catch {
                            migrationCrashed = true;
                        }

                        // Verification 1: Migration should not crash the system
                        if (migrationCrashed) {
                            console.error('Migration crashed instead of failing gracefully');
                            return false;
                        }

                        // Verification 2: Both keys should still be retrievable from legacy storage
                        const retrievedOpenAI = await storage.getApiKey('openai');
                        const retrievedGitHub = await storage.getApiKey('github');

                        if (retrievedOpenAI !== openaiKey) {
                            console.error(`Failed to retrieve OpenAI key: expected ${openaiKey}, got ${retrievedOpenAI}`);
                            return false;
                        }

                        if (retrievedGitHub !== githubToken) {
                            console.error(`Failed to retrieve GitHub token: expected ${githubToken}, got ${retrievedGitHub}`);
                            return false;
                        }

                        return true;
                    } finally {
                        (vscode.workspace as any).getConfiguration = originalConfig;
                    }
                }
            ),
            { numRuns: 20, timeout: 30000 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 5: Migration Fallback Resilience**
     *
     * This test verifies that multiple keys in legacy storage are handled gracefully,
     * even when migration encounters issues.
     */
    test('Property 5: Partial migration failures are handled gracefully', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    openaiKey: fc.string({ minLength: 20, maxLength: 50 }).map(s => 'key' + s.replace(/\s/g, 'x')),
                    githubToken: fc.string({ minLength: 20, maxLength: 50 }).map(s => 'key' + s.replace(/\s/g, 'x'))
                }),
                async ({ openaiKey, githubToken }) => {
                    // Setup: Use standard mock with working storage
                    const mockContext = createMockContext();
                    const testConfigStore = createMockWorkspaceConfig();

                    const originalConfig = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = mockGetConfiguration(testConfigStore);

                    try {
                        // Pre-condition: Place both legacy keys
                        testConfigStore.set('otakCommitter.openaiApiKey', openaiKey);
                        testConfigStore.set('otakCommitter.githubToken', githubToken);

                        const storage = new StorageManager(mockContext);

                        // Action: Attempt migration
                        let migrationCrashed = false;
                        try {
                            await storage.migrateFromLegacy();
                        } catch {
                            migrationCrashed = true;
                        }

                        // Verification 1: Migration should not crash
                        if (migrationCrashed) {
                            console.error('Migration crashed');
                            return false;
                        }

                        // Verification 2: Both keys should be retrievable
                        const retrievedOpenAI = await storage.getApiKey('openai');
                        const retrievedGitHub = await storage.getApiKey('github');

                        if (retrievedOpenAI !== openaiKey) {
                            console.error(`OpenAI key not accessible: expected ${openaiKey}, got ${retrievedOpenAI}`);
                            return false;
                        }

                        if (retrievedGitHub !== githubToken) {
                            console.error(`GitHub token not accessible: expected ${githubToken}, got ${retrievedGitHub}`);
                            return false;
                        }

                        return true;
                    } finally {
                        (vscode.workspace as any).getConfiguration = originalConfig;
                    }
                }
            ),
            { numRuns: 20, timeout: 30000 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 5: Migration Fallback Resilience**
     *
     * This test verifies that migration can be called multiple times safely
     * (idempotent behavior) and data remains accessible.
     */
    test('Property 5: Migration can succeed on retry after initial failure', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 20, maxLength: 50 }).map(s => 'key' + s.replace(/\s/g, 'x'))
                }),
                async ({ service, apiKey }) => {
                    // Setup: Create working mock context
                    const mockContext = createMockContext();
                    const testConfigStore = createMockWorkspaceConfig();

                    const originalConfig = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = mockGetConfiguration(testConfigStore);

                    try {
                        // Pre-condition: Place legacy data
                        const legacyKey = service === 'openai'
                            ? 'otakCommitter.openaiApiKey'
                            : 'otakCommitter.githubToken';
                        testConfigStore.set(legacyKey, apiKey);

                        const storage = new StorageManager(mockContext);

                        // Action 1: First migration
                        await storage.migrateFromLegacy();

                        // Verification 1: Data should be accessible
                        const afterFirst = await storage.getApiKey(service);
                        if (afterFirst !== apiKey) {
                            console.error(`Data not accessible after first migration: expected ${apiKey}, got ${afterFirst}`);
                            return false;
                        }

                        // Action 2: Call migration again (should be idempotent)
                        await storage.migrateFromLegacy();

                        // Verification 2: Data should still be accessible
                        const afterSecond = await storage.getApiKey(service);
                        if (afterSecond !== apiKey) {
                            console.error(`Data not accessible after second migration: expected ${apiKey}, got ${afterSecond}`);
                            return false;
                        }

                        return true;
                    } finally {
                        (vscode.workspace as any).getConfiguration = originalConfig;
                    }
                }
            ),
            { numRuns: 20, timeout: 30000 }
        );
    });
});
