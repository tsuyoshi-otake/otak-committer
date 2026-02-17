/**
 * Property-based tests for operation fallback behavior
 *
 * **Feature: extension-architecture-refactoring, Property 8: Operation Fallback Behavior**
 * **Validates: Requirements 4.2**
 *
 * Property: For any operation O that can fail, if O fails, the system should provide
 * a fallback behavior (default value, cached value, or graceful degradation) rather
 * than crashing or leaving the system in an inconsistent state.
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import * as vscode from 'vscode';
import { StorageManager } from '../../infrastructure/storage/StorageManager';
import { runPropertyTest, createTaggedPropertyTest } from '../../test/helpers/property-test.helper';

// Note: createMockContext is not used in this test file as we focus on failure scenarios
// It's kept here for potential future use in additional tests

/**
 * Creates a failing mock ExtensionContext where storage operations throw errors
 */
function createFailingMockContext(): vscode.ExtensionContext {
    return {
        secrets: {
            get: async (key: string) => {
                throw new Error('SecretStorage unavailable');
            },
            store: async (key: string, value: string) => {
                throw new Error('SecretStorage unavailable');
            },
            delete: async (key: string) => {
                throw new Error('SecretStorage unavailable');
            },
            onDidChange: undefined as any,
        },
        globalState: {
            get: <T>(key: string) => {
                throw new Error('GlobalState unavailable');
            },
            update: async (key: string, value: any) => {
                throw new Error('GlobalState unavailable');
            },
            keys: () => {
                throw new Error('GlobalState unavailable');
            },
            setKeysForSync: () => {},
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
        languageModelAccessInformation: undefined as any,
    };
}

suite('Operation Fallback Behavior Properties', () => {
    /**
     * Property 8: Operation Fallback Behavior - Storage Operations
     *
     * For any storage operation that fails, the system should return undefined
     * or a default value rather than throwing an exception that crashes the extension.
     *
     * This test verifies that:
     * 1. Failed getApiKey operations return undefined instead of throwing
     * 2. Failed getSecret operations return undefined instead of throwing
     * 3. Failed getConfig operations return undefined instead of throwing
     * 4. The system remains in a consistent state after failures
     */
    test(
        'Property 8: Storage operations provide fallback on failure',
        createTaggedPropertyTest(
            'extension-architecture-refactoring',
            8,
            'Operation Fallback Behavior',
            () => {
                runPropertyTest(
                    fc.asyncProperty(
                        fc.constantFrom('openai' as const, 'github' as const),
                        async (service) => {
                            // Create a context where storage operations fail
                            const failingContext = createFailingMockContext();
                            const storage = new StorageManager(failingContext);

                            // Property: getApiKey should not throw, should return undefined
                            let didThrow = false;
                            let result: string | undefined;

                            try {
                                result = await storage.getApiKey(service);
                            } catch (error) {
                                didThrow = true;
                            }

                            // Verify graceful degradation: no exception thrown
                            assert.strictEqual(
                                didThrow,
                                false,
                                'getApiKey should not throw when storage fails',
                            );

                            // Verify fallback behavior: returns undefined
                            assert.strictEqual(
                                result,
                                undefined,
                                'getApiKey should return undefined when storage fails',
                            );

                            return true;
                        },
                    ),
                );
            },
        ),
    );

    /**
     * Property 8: Generic secret operations provide fallback on failure
     *
     * Tests that generic secret operations (getSecret) also provide graceful
     * degradation when storage fails.
     */
    test('Property 8: Generic secret operations provide fallback on failure', () => {
        runPropertyTest(
            fc.asyncProperty(fc.string({ minLength: 5, maxLength: 50 }), async (key) => {
                const failingContext = createFailingMockContext();
                const storage = new StorageManager(failingContext);

                // Property: getSecret should not throw, should return undefined
                let didThrow = false;
                let result: string | undefined;

                try {
                    result = await storage.getSecret(key);
                } catch (error) {
                    didThrow = true;
                }

                // Verify graceful degradation
                assert.strictEqual(
                    didThrow,
                    false,
                    'getSecret should not throw when storage fails',
                );

                assert.strictEqual(
                    result,
                    undefined,
                    'getSecret should return undefined when storage fails',
                );

                return true;
            }),
        );
    });

    /**
     * Property 8: Configuration operations provide fallback on failure
     *
     * Tests that configuration operations provide graceful degradation
     * when configuration access fails.
     */
    test('Property 8: Configuration operations provide fallback on failure', () => {
        runPropertyTest(
            fc.asyncProperty(fc.string({ minLength: 5, maxLength: 50 }), async (key) => {
                const failingContext = createFailingMockContext();
                const storage = new StorageManager(failingContext);

                // Property: getConfig should not throw, should return undefined
                let didThrow = false;
                let result: string | undefined;

                try {
                    result = await storage.getConfig(key);
                } catch (error) {
                    didThrow = true;
                }

                // Verify graceful degradation
                assert.strictEqual(
                    didThrow,
                    false,
                    'getConfig should not throw when storage fails',
                );

                assert.strictEqual(
                    result,
                    undefined,
                    'getConfig should return undefined when storage fails',
                );

                return true;
            }),
        );
    });

    /**
     * Property 8: hasApiKey provides fallback on failure
     *
     * Tests that hasApiKey returns false (safe default) when storage fails
     * rather than throwing an exception.
     */
    test('Property 8: hasApiKey provides fallback on failure', () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.constantFrom('openai' as const, 'github' as const),
                async (service) => {
                    const failingContext = createFailingMockContext();
                    const storage = new StorageManager(failingContext);

                    // Property: hasApiKey should not throw, should return false
                    let didThrow = false;
                    let result: boolean;

                    try {
                        result = await storage.hasApiKey(service);
                    } catch (error) {
                        didThrow = true;
                        result = true; // Set to true to fail the assertion if exception occurs
                    }

                    // Verify graceful degradation
                    assert.strictEqual(
                        didThrow,
                        false,
                        'hasApiKey should not throw when storage fails',
                    );

                    // Verify safe default: returns false
                    assert.strictEqual(
                        result,
                        false,
                        'hasApiKey should return false (safe default) when storage fails',
                    );

                    return true;
                },
            ),
        );
    });

    /**
     * Property 8: Delete operations provide fallback on failure
     *
     * Tests that delete operations don't throw exceptions when storage fails.
     * Deletion failures are non-critical and should be handled gracefully.
     */
    test('Property 8: Delete operations provide fallback on failure', () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.constantFrom('openai' as const, 'github' as const),
                async (service) => {
                    const failingContext = createFailingMockContext();
                    const storage = new StorageManager(failingContext);

                    // Property: deleteApiKey should not throw
                    let didThrow = false;

                    try {
                        await storage.deleteApiKey(service);
                    } catch (error) {
                        didThrow = true;
                    }

                    // Verify graceful degradation: deletion failures are non-critical
                    assert.strictEqual(
                        didThrow,
                        false,
                        'deleteApiKey should not throw when storage fails',
                    );

                    return true;
                },
            ),
        );
    });

    /**
     * Property 8: Partial storage failure provides fallback
     *
     * Tests that when some storage mechanisms fail but others succeed,
     * the system uses the working storage as a fallback.
     */
    test('Property 8: Partial storage failure uses working storage as fallback', () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 10, maxLength: 100 }),
                }),
                async ({ service, apiKey }) => {
                    // Create a context where SecretStorage fails but Configuration works
                    const configStore = new Map<string, any>();
                    const partiallyFailingContext: vscode.ExtensionContext = {
                        secrets: {
                            get: async (key: string) => {
                                throw new Error('SecretStorage unavailable');
                            },
                            store: async (key: string, value: string) => {
                                throw new Error('SecretStorage unavailable');
                            },
                            delete: async (key: string) => {
                                throw new Error('SecretStorage unavailable');
                            },
                            onDidChange: undefined as any,
                        },
                        globalState: {
                            get: <T>(key: string) => configStore.get(key) as T,
                            update: async (key: string, value: any) => {
                                if (value === undefined) {
                                    configStore.delete(key);
                                } else {
                                    configStore.set(key, value);
                                }
                            },
                            keys: () => Array.from(configStore.keys()),
                            setKeysForSync: () => {},
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
                        languageModelAccessInformation: undefined as any,
                    };

                    // Simulate legacy data in workspace configuration
                    const originalGet = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = (section?: string) => {
                        if (section === 'otakCommitter') {
                            return {
                                get: (key: string) => {
                                    if (key === 'openaiApiKey' && service === 'openai') {
                                        return apiKey;
                                    }
                                    if (key === 'githubToken' && service === 'github') {
                                        return apiKey;
                                    }
                                    return undefined;
                                },
                                has: (key: string) => {
                                    if (key === 'openaiApiKey' && service === 'openai') {
                                        return true;
                                    }
                                    if (key === 'githubToken' && service === 'github') {
                                        return true;
                                    }
                                    return false;
                                },
                                update: async () => {},
                                inspect: () => undefined,
                            };
                        }
                        return originalGet(section);
                    };

                    const storage = new StorageManager(partiallyFailingContext);

                    // Property: Should fall back to legacy storage when primary fails
                    let didThrow = false;
                    let result: string | undefined;

                    try {
                        result = await storage.getApiKey(service);
                    } catch (error) {
                        didThrow = true;
                    } finally {
                        // Restore original getConfiguration
                        (vscode.workspace as any).getConfiguration = originalGet;
                    }

                    // Verify graceful degradation: no exception
                    assert.strictEqual(
                        didThrow,
                        false,
                        'getApiKey should not throw when primary storage fails but fallback exists',
                    );

                    // Verify fallback behavior: returns value from legacy storage
                    assert.strictEqual(
                        result,
                        apiKey,
                        'getApiKey should return value from fallback storage',
                    );

                    return true;
                },
            ),
        );
    });
    /**
     * Property 8: Migration failures don't prevent extension from loading
     *
     * Tests that when migration fails, the extension continues to function
     * using legacy storage as a fallback.
     */
    test('Property 8: Migration failures provide fallback to legacy storage', () => {
        runPropertyTest(
            fc.asyncProperty(
                fc.record({
                    service: fc.constantFrom('openai' as const, 'github' as const),
                    apiKey: fc.string({ minLength: 10, maxLength: 100 }),
                }),
                async ({ service, apiKey }) => {
                    // Create a context where migration will fail
                    const failingContext = createFailingMockContext();

                    // Set up legacy storage with data
                    const originalGet = vscode.workspace.getConfiguration;
                    (vscode.workspace as any).getConfiguration = (section?: string) => {
                        if (section === 'otakCommitter') {
                            return {
                                get: (key: string) => {
                                    if (key === 'openaiApiKey' && service === 'openai') {
                                        return apiKey;
                                    }
                                    if (key === 'githubToken' && service === 'github') {
                                        return apiKey;
                                    }
                                    return undefined;
                                },
                                has: (key: string) => {
                                    if (key === 'openaiApiKey' && service === 'openai') {
                                        return true;
                                    }
                                    if (key === 'githubToken' && service === 'github') {
                                        return true;
                                    }
                                    return false;
                                },
                                update: async () => {
                                    throw new Error('Configuration update failed');
                                },
                                inspect: () => undefined,
                            };
                        }
                        return originalGet(section);
                    };

                    const storage = new StorageManager(failingContext);

                    // Property: migrateFromLegacy should not throw
                    let didThrow = false;

                    try {
                        await storage.migrateFromLegacy();
                    } catch (error) {
                        didThrow = true;
                    }

                    // Verify graceful degradation: migration failure doesn't crash
                    assert.strictEqual(
                        didThrow,
                        false,
                        'migrateFromLegacy should not throw when migration fails',
                    );

                    // Property: After failed migration, data should still be accessible
                    let result: string | undefined;
                    try {
                        result = await storage.getApiKey(service);
                    } catch (error) {
                        // Ignore
                    } finally {
                        // Restore original getConfiguration
                        (vscode.workspace as any).getConfiguration = originalGet;
                    }

                    // Verify fallback: legacy data is still accessible
                    assert.strictEqual(
                        result,
                        apiKey,
                        'After failed migration, data should still be accessible from legacy storage',
                    );

                    return true;
                },
            ),
        );
    });
});
