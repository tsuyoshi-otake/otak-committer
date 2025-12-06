/**
 * Property-based tests for automatic legacy migration
 * 
 * **Feature: extension-architecture-refactoring, Property 4: Automatic Legacy Migration**
 * **Validates: Requirements 3.2**
 * 
 * Property: For any legacy data format that exists in Configuration storage, when the 
 * extension activates, the data should be automatically migrated to the new SecretStorage 
 * format and the legacy format should be cleared.
 */

import * as fc from 'fast-check';
import * as vscode from 'vscode';
import { StorageManager } from '../../infrastructure/storage/StorageManager';
import { ConfigStorageProvider } from '../../infrastructure/storage/ConfigStorageProvider';

/**
 * Creates a mock ExtensionContext for testing
 */
function createMockContext(): vscode.ExtensionContext {
    const secretStore = new Map<string, string>();
    const globalStateStore = new Map<string, any>();
    
    return {
        secrets: {
            get: async (key: string) => secretStore.get(key),
            store: async (key: string, value: string) => {
                secretStore.set(key, value);
            },
            delete: async (key: string) => {
                secretStore.delete(key);
            },
            onDidChange: undefined as any
        },
        globalState: {
            get: <T>(key: string) => globalStateStore.get(key) as T,
            update: async (key: string, value: any) => {
                if (value === undefined) {
                    globalStateStore.delete(key);
                } else {
                    globalStateStore.set(key, value);
                }
            },
            keys: () => Array.from(globalStateStore.keys()),
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

suite('Migration Property Tests', () => {
    let originalGetConfiguration: typeof vscode.workspace.getConfiguration;
    let configStore: Map<string, any>;

    setup(() => {
        // Save original implementation
        originalGetConfiguration = vscode.workspace.getConfiguration;
        
        // Create mock config store
        configStore = createMockWorkspaceConfig();
        
        // Mock vscode.workspace.getConfiguration
        (vscode.workspace as any).getConfiguration = mockGetConfiguration(configStore);
    });

    teardown(() => {
        // Restore original implementation
        (vscode.workspace as any).getConfiguration = originalGetConfiguration;
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 4: Automatic Legacy Migration**
     * 
     * This test verifies that when legacy data exists in Configuration storage,
     * calling migrateFromLegacy() will:
     * 1. Move the data to SecretStorage
     * 2. Clear the data from Configuration storage
     * 3. Set the migration completed flag
     */
    test('Property 4: Legacy data is migrated to SecretStorage and cleared from Configuration', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    openaiKey: fc.string({ minLength: 20, maxLength: 100 }),
                    githubToken: fc.string({ minLength: 20, maxLength: 100 })
                }),
                async ({ openaiKey, githubToken }) => {
                    // Setup: Create fresh context and config store for each test
                    const mockContext = createMockContext();
                    const testConfigStore = createMockWorkspaceConfig();
                    
                    // Mock getConfiguration for this test iteration
                    const originalConfig = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = mockGetConfiguration(testConfigStore);
                    
                    try {
                        // Pre-condition: Place legacy data in Configuration storage
                        testConfigStore.set('otakCommitter.openaiApiKey', openaiKey);
                        testConfigStore.set('otakCommitter.githubToken', githubToken);
                        
                        // Verify legacy data exists before migration
                        const configProvider = new ConfigStorageProvider();
                        const legacyOpenAI = await configProvider.get('otakCommitter.openaiApiKey');
                        const legacyGitHub = await configProvider.get('otakCommitter.githubToken');
                        
                        if (legacyOpenAI !== openaiKey || legacyGitHub !== githubToken) {
                            console.error('Pre-condition failed: Legacy data not set correctly');
                            return false;
                        }
                        
                        // Action: Perform migration
                        const storage = new StorageManager(mockContext);
                        await storage.migrateFromLegacy();
                        
                        // Verification 1: Data should now be in SecretStorage
                        const migratedOpenAI = await storage.getApiKey('openai');
                        const migratedGitHub = await storage.getApiKey('github');
                        
                        if (migratedOpenAI !== openaiKey) {
                            console.error(`OpenAI key migration failed: expected ${openaiKey}, got ${migratedOpenAI}`);
                            return false;
                        }
                        
                        if (migratedGitHub !== githubToken) {
                            console.error(`GitHub token migration failed: expected ${githubToken}, got ${migratedGitHub}`);
                            return false;
                        }
                        
                        // Verification 2: Legacy data should be cleared from Configuration
                        const remainingOpenAI = await configProvider.get('otakCommitter.openaiApiKey');
                        const remainingGitHub = await configProvider.get('otakCommitter.githubToken');
                        
                        if (remainingOpenAI !== undefined) {
                            console.error(`Legacy OpenAI key not cleared: ${remainingOpenAI}`);
                            return false;
                        }
                        
                        if (remainingGitHub !== undefined) {
                            console.error(`Legacy GitHub token not cleared: ${remainingGitHub}`);
                            return false;
                        }
                        
                        // Verification 3: Migration flag should be set
                        const migrationCompleted = mockContext.globalState.get<boolean>(
                            'otak-committer.migrationCompleted'
                        );
                        
                        if (!migrationCompleted) {
                            console.error('Migration flag not set');
                            return false;
                        }
                        
                        return true;
                    } finally {
                        // Restore original configuration
                        (vscode.workspace as any).getConfiguration = originalConfig;
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 4: Automatic Legacy Migration**
     * 
     * This test verifies that migration is idempotent - running it multiple times
     * should not cause issues or data loss.
     */
    test('Property 4: Migration is idempotent - can be run multiple times safely', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    openaiKey: fc.string({ minLength: 20, maxLength: 100 })
                }),
                async ({ openaiKey }) => {
                    // Setup
                    const mockContext = createMockContext();
                    const testConfigStore = createMockWorkspaceConfig();
                    
                    const originalConfig = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = mockGetConfiguration(testConfigStore);
                    
                    try {
                        // Pre-condition: Place legacy data
                        testConfigStore.set('otakCommitter.openaiApiKey', openaiKey);
                        
                        const storage = new StorageManager(mockContext);
                        
                        // Action: Run migration twice
                        await storage.migrateFromLegacy();
                        await storage.migrateFromLegacy();
                        
                        // Verification: Data should still be correct after second migration
                        const migratedKey = await storage.getApiKey('openai');
                        
                        if (migratedKey !== openaiKey) {
                            console.error(`Idempotent migration failed: expected ${openaiKey}, got ${migratedKey}`);
                            return false;
                        }
                        
                        // Verification: Migration flag should still be set
                        const migrationCompleted = mockContext.globalState.get<boolean>(
                            'otak-committer.migrationCompleted'
                        );
                        
                        return migrationCompleted === true;
                    } finally {
                        (vscode.workspace as any).getConfiguration = originalConfig;
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 4: Automatic Legacy Migration**
     * 
     * This test verifies that if no legacy data exists, migration completes
     * successfully without errors.
     */
    test('Property 4: Migration succeeds when no legacy data exists', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constant(null),
                async () => {
                    // Setup
                    const mockContext = createMockContext();
                    const testConfigStore = createMockWorkspaceConfig();
                    
                    const originalConfig = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = mockGetConfiguration(testConfigStore);
                    
                    try {
                        // Pre-condition: No legacy data exists
                        const storage = new StorageManager(mockContext);
                        
                        // Action: Run migration
                        await storage.migrateFromLegacy();
                        
                        // Verification: Migration flag should be set
                        const migrationCompleted = mockContext.globalState.get<boolean>(
                            'otak-committer.migrationCompleted'
                        );
                        
                        if (!migrationCompleted) {
                            console.error('Migration flag not set when no legacy data exists');
                            return false;
                        }
                        
                        // Verification: No data should be in storage
                        const openaiKey = await storage.getApiKey('openai');
                        const githubToken = await storage.getApiKey('github');
                        
                        return openaiKey === undefined && githubToken === undefined;
                    } finally {
                        (vscode.workspace as any).getConfiguration = originalConfig;
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 4: Automatic Legacy Migration**
     * 
     * This test verifies that partial legacy data (only one service) is migrated correctly.
     */
    test('Property 4: Partial legacy data migration works correctly', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 20, maxLength: 100 })
                }),
                async ({ service, apiKey }) => {
                    // Setup
                    const mockContext = createMockContext();
                    const testConfigStore = createMockWorkspaceConfig();
                    
                    const originalConfig = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = mockGetConfiguration(testConfigStore);
                    
                    try {
                        // Pre-condition: Place legacy data for only one service
                        const legacyKey = service === 'openai' 
                            ? 'otakCommitter.openaiApiKey' 
                            : 'otakCommitter.githubToken';
                        testConfigStore.set(legacyKey, apiKey);
                        
                        const storage = new StorageManager(mockContext);
                        
                        // Action: Run migration
                        await storage.migrateFromLegacy();
                        
                        // Verification: Only the specified service should have data
                        const migratedKey = await storage.getApiKey(service);
                        const otherService = service === 'openai' ? 'github' : 'openai';
                        const otherKey = await storage.getApiKey(otherService);
                        
                        if (migratedKey !== apiKey) {
                            console.error(`Migration failed for ${service}: expected ${apiKey}, got ${migratedKey}`);
                            return false;
                        }
                        
                        if (otherKey !== undefined) {
                            console.error(`Unexpected data for ${otherService}: ${otherKey}`);
                            return false;
                        }
                        
                        // Verification: Legacy data should be cleared
                        const configProvider = new ConfigStorageProvider();
                        const remainingLegacy = await configProvider.get(legacyKey);
                        
                        return remainingLegacy === undefined;
                    } finally {
                        (vscode.workspace as any).getConfiguration = originalConfig;
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
