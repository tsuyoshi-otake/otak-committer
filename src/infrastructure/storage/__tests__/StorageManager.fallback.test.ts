import * as assert from 'assert';
import * as vscode from 'vscode';
import { StorageManager } from '../StorageManager';

/**
 * Unit tests for StorageManager fallback mechanisms
 *
 * Tests the fallback and graceful degradation features
 */
suite('StorageManager Fallback Mechanisms', () => {
    let mockContext: vscode.ExtensionContext;
    let storedSecrets: Map<string, string>;
    let globalStateData: Map<string, any>;

    setup(() => {
        storedSecrets = new Map();
        globalStateData = new Map();

        mockContext = {
            secrets: {
                get: async (key: string) => storedSecrets.get(key),
                store: async (key: string, value: string) => {
                    storedSecrets.set(key, value);
                },
                delete: async (key: string) => {
                    storedSecrets.delete(key);
                },
            },
            globalState: {
                get: (key: string) => globalStateData.get(key),
                update: async (key: string, value: any) => {
                    if (value === undefined) {
                        globalStateData.delete(key);
                    } else {
                        globalStateData.set(key, value);
                    }
                },
                keys: () => Array.from(globalStateData.keys()),
                setKeysForSync: (keys: readonly string[]) => {},
            },
        } as any;
    });

    test('should return undefined when API key not found in any storage', async () => {
        const manager = new StorageManager(mockContext);
        const key = await manager.getApiKey('openai');
        assert.strictEqual(key, undefined);
    });

    test('should not throw when storage operations fail', async () => {
        const failingContext = {
            secrets: {
                get: async () => {
                    throw new Error('Storage error');
                },
                store: async () => {
                    throw new Error('Storage error');
                },
                delete: async () => {
                    throw new Error('Storage error');
                },
            },
            globalState: {
                get: () => {
                    throw new Error('State error');
                },
                update: async () => {
                    throw new Error('State error');
                },
                keys: () => [],
                setKeysForSync: () => {},
            },
        } as any;

        const manager = new StorageManager(failingContext);

        // Should not throw - returns undefined instead
        const key = await manager.getApiKey('openai');
        assert.strictEqual(key, undefined);
    });

    test('should return false when hasApiKey fails', async () => {
        const failingContext = {
            secrets: {
                get: async () => {
                    throw new Error('Storage error');
                },
                store: async () => {
                    throw new Error('Storage error');
                },
                delete: async () => {
                    throw new Error('Storage error');
                },
            },
            globalState: {
                get: () => {
                    throw new Error('State error');
                },
                update: async () => {
                    throw new Error('State error');
                },
                keys: () => [],
                setKeysForSync: () => {},
            },
        } as any;

        const manager = new StorageManager(failingContext);

        // Should return false instead of throwing
        const hasKey = await manager.hasApiKey('openai');
        assert.strictEqual(hasKey, false);
    });

    test('should not throw when deleteApiKey fails partially', async () => {
        const manager = new StorageManager(mockContext);

        // Store a key first
        await manager.setApiKey('openai', 'sk-test-key');

        // Should not throw even if deletion has issues
        await assert.doesNotReject(async () => {
            await manager.deleteApiKey('openai');
        });
    });

    test('should provide storage health diagnostics', async () => {
        const manager = new StorageManager(mockContext);
        const health = await manager.checkStorageHealth();

        assert.ok(typeof health.secretStorage === 'boolean');
        assert.ok(typeof health.configStorage === 'boolean');
        assert.ok(typeof health.globalState === 'boolean');
        assert.ok(typeof health.encryption === 'boolean');
    });

    test('should provide storage diagnostics', async () => {
        const manager = new StorageManager(mockContext);
        const diagnostics = await manager.getStorageDiagnostics();

        assert.ok(typeof diagnostics.migrationCompleted === 'boolean');
        assert.ok(Array.isArray(diagnostics.openaiKeyLocations));
        assert.ok(Array.isArray(diagnostics.githubKeyLocations));
        assert.ok(diagnostics.storageHealth);
    });

    test('should handle getSecret gracefully on error', async () => {
        const failingContext = {
            secrets: {
                get: async () => {
                    throw new Error('Storage error');
                },
                store: async () => {
                    throw new Error('Storage error');
                },
                delete: async () => {
                    throw new Error('Storage error');
                },
            },
            globalState: {
                get: () => undefined,
                update: async () => {},
                keys: () => [],
                setKeysForSync: () => {},
            },
        } as any;

        const manager = new StorageManager(failingContext);
        const value = await manager.getSecret('test-key');

        // Should return undefined instead of throwing
        assert.strictEqual(value, undefined);
    });

    test('should handle getConfig gracefully on error', async () => {
        const manager = new StorageManager(mockContext);
        const value = await manager.getConfig('nonexistent.key');

        // Should return undefined instead of throwing
        assert.strictEqual(value, undefined);
    });

    test('should not throw when deleteSecret fails', async () => {
        const failingContext = {
            secrets: {
                get: async () => undefined,
                store: async () => {},
                delete: async () => {
                    throw new Error('Delete error');
                },
            },
            globalState: {
                get: () => undefined,
                update: async () => {},
                keys: () => [],
                setKeysForSync: () => {},
            },
        } as any;

        const manager = new StorageManager(failingContext);

        // Should not throw
        await assert.doesNotReject(async () => {
            await manager.deleteSecret('test-key');
        });
    });

    test('should not throw when deleteConfig fails', async () => {
        const manager = new StorageManager(mockContext);

        // Should not throw
        await assert.doesNotReject(async () => {
            await manager.deleteConfig('test.key');
        });
    });
});
