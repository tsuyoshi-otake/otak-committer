/**
 * Property-based tests for unified storage abstraction
 * 
 * **Feature: extension-architecture-refactoring, Property 3: Unified Storage Abstraction**
 * **Validates: Requirements 3.1**
 * 
 * Property: For any storage operation (get, set, delete, has), the operation should go 
 * through the StorageManager interface rather than directly accessing VS Code's 
 * SecretStorage or Configuration APIs.
 */

import * as fc from 'fast-check';
import * as vscode from 'vscode';
import { StorageManager } from '../../infrastructure/storage/StorageManager';

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

suite('Storage Property Tests', () => {
    /**
     * **Feature: extension-architecture-refactoring, Property 3: Unified Storage Abstraction**
     * 
     * This test verifies that all storage operations maintain consistency through
     * the StorageManager interface. For any key-value pair, storing and retrieving
     * through StorageManager should preserve the value.
     */
    test('Property 3: Unified Storage Abstraction - round trip consistency', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 10, maxLength: 100 })
                }),
                async ({ service, apiKey }) => {
                    const mockContext = createMockContext();
                    const storage = new StorageManager(mockContext);

                    // Property: Set then Get should return the same value
                    await storage.setApiKey(service, apiKey);
                    const retrieved = await storage.getApiKey(service);

                    return retrieved === apiKey;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 3: Unified Storage Abstraction**
     * 
     * This test verifies that the has() operation correctly reflects the presence
     * of stored values through the unified interface.
     */
    test('Property 3: Unified Storage Abstraction - has() consistency', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 10, maxLength: 100 })
                }),
                async ({ service, apiKey }) => {
                    const mockContext = createMockContext();
                    const storage = new StorageManager(mockContext);

                    // Property: After setting a value, has() should return true
                    const beforeSet = await storage.hasApiKey(service);
                    await storage.setApiKey(service, apiKey);
                    const afterSet = await storage.hasApiKey(service);

                    return !beforeSet && afterSet;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 3: Unified Storage Abstraction**
     * 
     * This test verifies that delete operations work correctly through the
     * unified interface, removing values from all storage locations.
     */
    test('Property 3: Unified Storage Abstraction - delete consistency', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 10, maxLength: 100 })
                }),
                async ({ service, apiKey }) => {
                    const mockContext = createMockContext();
                    const storage = new StorageManager(mockContext);

                    // Property: After deleting, get() should return undefined and has() should return false
                    await storage.setApiKey(service, apiKey);
                    await storage.deleteApiKey(service);
                    const retrieved = await storage.getApiKey(service);
                    const exists = await storage.hasApiKey(service);

                    return retrieved === undefined && !exists;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 3: Unified Storage Abstraction**
     * 
     * This test verifies that generic secret operations (getSecret/setSecret) also
     * maintain consistency through the unified interface.
     */
    test('Property 3: Unified Storage Abstraction - generic secret round trip', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    key: fc.string({ minLength: 5, maxLength: 50 }),
                    value: fc.string({ minLength: 1, maxLength: 100 })
                }),
                async ({ key, value }) => {
                    const mockContext = createMockContext();
                    const storage = new StorageManager(mockContext);

                    // Property: Generic secret operations should also maintain round-trip consistency
                    await storage.setSecret(key, value);
                    const retrieved = await storage.getSecret(key);

                    return retrieved === value;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 6: Storage Consistency**
     * **Validates: Requirements 3.4**
     * 
     * This test verifies that sensitive data stored in SecretStorage does not exist
     * in plain-text Configuration storage. For any configuration key K, if a value V
     * is stored in SecretStorage, then reading K should return V, and the value should
     * not exist in plain-text Configuration storage.
     */
    test('Property 6: Storage Consistency - sensitive data only in SecretStorage', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 20, maxLength: 100 })
                }),
                async ({ service, apiKey }) => {
                    const mockContext = createMockContext();
                    const storage = new StorageManager(mockContext);

                    // Store API key using StorageManager
                    await storage.setApiKey(service, apiKey);

                    // Property 1: Reading should return the stored value
                    const retrieved = await storage.getApiKey(service);
                    const valueMatches = retrieved === apiKey;

                    // Property 2: Value should be in SecretStorage
                    const secretKey = `${service}.apiKey`;
                    const inSecretStorage = await mockContext.secrets.get(secretKey);
                    const existsInSecret = inSecretStorage === apiKey;

                    // Property 3: Value should NOT be in plain-text Configuration
                    const legacyKey = service === 'openai' 
                        ? 'otakCommitter.openaiApiKey' 
                        : 'otakCommitter.githubToken';
                    const config = vscode.workspace.getConfiguration();
                    const inConfig = config.get<string>(legacyKey);
                    const notInPlainConfig = inConfig === undefined;

                    // All three properties must hold
                    return valueMatches && existsInSecret && notInPlainConfig;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 6: Storage Consistency**
     * **Validates: Requirements 3.4**
     *
     * This test verifies that after migration from legacy storage, the sensitive data
     * is removed from Configuration and only exists in SecretStorage.
     *
     * SKIPPED: Requires workspace environment for Configuration API
     */
    test.skip('Property 6: Storage Consistency - migration removes plain-text data', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 20, maxLength: 100 })
                }),
                async ({ service, apiKey }) => {
                    const mockContext = createMockContext();
                    
                    // Simulate legacy storage: put API key in Configuration
                    const legacyKey = service === 'openai' 
                        ? 'otakCommitter.openaiApiKey' 
                        : 'otakCommitter.githubToken';
                    const config = vscode.workspace.getConfiguration();
                    await config.update(legacyKey, apiKey, vscode.ConfigurationTarget.Global);

                    // Create StorageManager and trigger migration
                    const storage = new StorageManager(mockContext);
                    
                    // Access the API key (which should trigger migration)
                    const retrieved = await storage.getApiKey(service);

                    // Property 1: Should retrieve the value
                    const valueRetrieved = retrieved === apiKey;

                    // Property 2: Value should now be in SecretStorage
                    const secretKey = `${service}.apiKey`;
                    const inSecretStorage = await mockContext.secrets.get(secretKey);
                    const existsInSecret = inSecretStorage === apiKey;

                    // Property 3: Value should be removed from Configuration
                    const stillInConfig = config.get<string>(legacyKey);
                    const removedFromConfig = stillInConfig === undefined;

                    // All three properties must hold after migration
                    return valueRetrieved && existsInSecret && removedFromConfig;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: extension-architecture-refactoring, Property 6: Storage Consistency**
     * **Validates: Requirements 3.4**
     *
     * This test verifies that deleting an API key removes it from all storage locations,
     * ensuring no sensitive data is left behind in any storage mechanism.
     *
     * SKIPPED: Requires workspace environment for Configuration API
     */
    test.skip('Property 6: Storage Consistency - deletion removes from all locations', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 20, maxLength: 100 })
                }),
                async ({ service, apiKey }) => {
                    const mockContext = createMockContext();
                    const storage = new StorageManager(mockContext);

                    // Store API key
                    await storage.setApiKey(service, apiKey);

                    // Delete API key
                    await storage.deleteApiKey(service);

                    // Property 1: Should not be retrievable
                    const retrieved = await storage.getApiKey(service);
                    const notRetrievable = retrieved === undefined;

                    // Property 2: Should not exist in SecretStorage
                    const secretKey = `${service}.apiKey`;
                    const inSecretStorage = await mockContext.secrets.get(secretKey);
                    const notInSecret = inSecretStorage === undefined;

                    // Property 3: Should not exist in Configuration
                    const legacyKey = service === 'openai' 
                        ? 'otakCommitter.openaiApiKey' 
                        : 'otakCommitter.githubToken';
                    const config = vscode.workspace.getConfiguration();
                    const inConfig = config.get<string>(legacyKey);
                    const notInConfig = inConfig === undefined;

                    // Property 4: hasApiKey should return false
                    const exists = await storage.hasApiKey(service);
                    const doesNotExist = !exists;

                    // All properties must hold after deletion
                    return notRetrievable && notInSecret && notInConfig && doesNotExist;
                }
            ),
            { numRuns: 100 }
        );
    });
});
