import * as assert from 'assert';
import * as vscode from 'vscode';
import { StorageManager } from '../StorageManager';

/**
 * Unit tests for StorageManager
 *
 * Tests the unified storage abstraction for API keys and configuration
 * _Requirements: 7.1_
 */
suite('StorageManager', () => {
    let storageManager: StorageManager;
    let mockContext: vscode.ExtensionContext;

    setup(() => {
        // Create a mock extension context
        mockContext = {
            secrets: {
                get: async (key: string) => undefined,
                store: async (key: string, value: string) => {},
                delete: async (key: string) => {},
            },
            globalState: {
                get: (key: string) => undefined,
                update: async (key: string, value: any) => {},
                keys: () => [],
                setKeysForSync: (keys: readonly string[]) => {},
            },
        } as any;

        storageManager = new StorageManager(mockContext);
    });

    test('should create StorageManager instance', () => {
        assert.ok(storageManager);
    });

    test('should have getApiKey method', () => {
        assert.strictEqual(typeof storageManager.getApiKey, 'function');
    });

    test('should have setApiKey method', () => {
        assert.strictEqual(typeof storageManager.setApiKey, 'function');
    });

    test('should have deleteApiKey method', () => {
        assert.strictEqual(typeof storageManager.deleteApiKey, 'function');
    });

    test('should have hasApiKey method', () => {
        assert.strictEqual(typeof storageManager.hasApiKey, 'function');
    });

    test('should have migrateFromLegacy method', () => {
        assert.strictEqual(typeof storageManager.migrateFromLegacy, 'function');
    });

    suite('API Key Storage and Retrieval', () => {
        let storedSecrets: Map<string, string>;
        let globalStateData: Map<string, any>;
        let testContext: vscode.ExtensionContext;

        setup(() => {
            storedSecrets = new Map();
            globalStateData = new Map();

            testContext = {
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

        test('should store and retrieve OpenAI API key', async () => {
            const manager = new StorageManager(testContext);
            const testKey = 'sk-test-openai-key-12345';

            await manager.setApiKey('openai', testKey);
            const retrieved = await manager.getApiKey('openai');

            assert.strictEqual(retrieved, testKey, 'Retrieved key should match stored key');
            assert.ok(storedSecrets.has('openai.apiKey'), 'Key should be in SecretStorage');
        });

        test('should store and retrieve GitHub API key', async () => {
            const manager = new StorageManager(testContext);
            const testKey = 'ghp_test-github-token-67890';

            await manager.setApiKey('github', testKey);
            const retrieved = await manager.getApiKey('github');

            assert.strictEqual(retrieved, testKey, 'Retrieved key should match stored key');
            assert.ok(storedSecrets.has('github.apiKey'), 'Key should be in SecretStorage');
        });

        test('should return undefined for non-existent API key', async () => {
            const manager = new StorageManager(testContext);
            const retrieved = await manager.getApiKey('openai');

            assert.strictEqual(
                retrieved,
                undefined,
                'Should return undefined for non-existent key',
            );
        });

        test('should not store API key backup in GlobalState', async () => {
            const manager = new StorageManager(testContext);
            const testKey = 'sk-test-key-without-backup';

            await manager.setApiKey('openai', testKey);

            const backupKey = 'otak-committer.backup.openai.apiKey';

            assert.strictEqual(
                globalStateData.has(backupKey),
                false,
                'API key backup should not exist in GlobalState',
            );
            assert.strictEqual(
                Array.from(globalStateData.values()).includes(testKey),
                false,
                'API key should not be stored in GlobalState',
            );
        });

        test('should delete API key from all storage locations', async () => {
            const manager = new StorageManager(testContext);
            const testKey = 'sk-test-key-to-delete';

            await manager.setApiKey('openai', testKey);
            assert.ok(storedSecrets.has('openai.apiKey'), 'Key should exist before deletion');

            await manager.deleteApiKey('openai');

            assert.strictEqual(
                storedSecrets.has('openai.apiKey'),
                false,
                'Key should be deleted from SecretStorage',
            );
            const retrieved = await manager.getApiKey('openai');
            assert.strictEqual(
                retrieved,
                undefined,
                'Key should not be retrievable after deletion',
            );
        });

        test('should correctly report if API key exists', async () => {
            const manager = new StorageManager(testContext);

            let hasKey = await manager.hasApiKey('openai');
            assert.strictEqual(hasKey, false, 'Should return false when key does not exist');

            await manager.setApiKey('openai', 'sk-test-key');
            hasKey = await manager.hasApiKey('openai');
            assert.strictEqual(hasKey, true, 'Should return true when key exists');
        });

        test('should handle empty string API keys', async () => {
            const manager = new StorageManager(testContext);

            await manager.setApiKey('openai', '');
            const retrieved = await manager.getApiKey('openai');

            // Empty strings should be treated as no key
            assert.strictEqual(retrieved, undefined, 'Empty string should be treated as no key');
        });

        test('should handle whitespace-only API keys', async () => {
            const manager = new StorageManager(testContext);

            await manager.setApiKey('openai', '   ');
            const retrieved = await manager.getApiKey('openai');

            // Whitespace-only strings should be treated as no key
            assert.strictEqual(
                retrieved,
                undefined,
                'Whitespace-only string should be treated as no key',
            );
        });

        test('should store multiple API keys independently', async () => {
            const manager = new StorageManager(testContext);
            const openaiKey = 'sk-openai-key';
            const githubKey = 'ghp-github-key';

            await manager.setApiKey('openai', openaiKey);
            await manager.setApiKey('github', githubKey);

            const retrievedOpenai = await manager.getApiKey('openai');
            const retrievedGithub = await manager.getApiKey('github');

            assert.strictEqual(retrievedOpenai, openaiKey, 'OpenAI key should be correct');
            assert.strictEqual(retrievedGithub, githubKey, 'GitHub key should be correct');
        });

        test('should overwrite existing API key', async () => {
            const manager = new StorageManager(testContext);
            const oldKey = 'sk-old-key';
            const newKey = 'sk-new-key';

            await manager.setApiKey('openai', oldKey);
            await manager.setApiKey('openai', newKey);

            const retrieved = await manager.getApiKey('openai');
            assert.strictEqual(retrieved, newKey, 'Should retrieve the new key');
        });
    });

    suite('Migration Scenarios', () => {
        let migrationContext: vscode.ExtensionContext;
        let storedSecrets: Map<string, string>;
        let globalStateData: Map<string, any>;
        let configData: Map<string, any>;

        setup(() => {
            storedSecrets = new Map();
            globalStateData = new Map();
            configData = new Map();

            migrationContext = {
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

            // Mock workspace configuration
            (vscode.workspace as any).getConfiguration = (section?: string) => {
                return {
                    get: (key: string) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        return configData.get(fullKey);
                    },
                    update: async (key: string, value: any) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        if (value === undefined) {
                            configData.delete(fullKey);
                        } else {
                            configData.set(fullKey, value);
                        }
                    },
                    has: (key: string) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        return configData.has(fullKey);
                    },
                    inspect: () => undefined,
                };
            };
        });

        test('should detect when migration is not needed', async () => {
            // Set migration flag to true
            globalStateData.set('otak-committer.migrationCompleted', true);

            const manager = new StorageManager(migrationContext);
            await manager.migrateFromLegacy();

            // Should not have migrated anything
            assert.strictEqual(
                storedSecrets.size,
                0,
                'No secrets should be stored when migration already completed',
            );
        });

        test('should set migration completion flag', async () => {
            const manager = new StorageManager(migrationContext);
            await manager.migrateFromLegacy();

            // Verify migration flag was set
            assert.strictEqual(
                globalStateData.get('otak-committer.migrationCompleted'),
                true,
                'Migration completion flag should be set',
            );
        });

        test('should not throw error if migration fails', async () => {
            // Create a context that will fail
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
                    update: async () => {
                        throw new Error('State error');
                    },
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            const manager = new StorageManager(failingContext);

            // Should not throw - migration errors are caught
            await assert.doesNotReject(async () => {
                await manager.migrateFromLegacy();
            });
        });

        test('should migrate from legacy configuration when key exists', async () => {
            const manager = new StorageManager(migrationContext);
            const legacyKey = 'sk-legacy-key-12345';

            // Simulate legacy key in configuration
            configData.set('otakCommitter.openaiApiKey', legacyKey);

            // Get the key - should trigger migration
            const retrieved = await manager.getApiKey('openai');

            assert.strictEqual(retrieved, legacyKey, 'Should retrieve legacy key');
            // After migration, key should be in SecretStorage
            assert.ok(
                storedSecrets.has('openai.apiKey'),
                'Key should be migrated to SecretStorage',
            );
        });

        test('should clean up legacy storage after successful migration', async () => {
            const manager = new StorageManager(migrationContext);
            const legacyKey = 'sk-legacy-key-to-cleanup';

            configData.set('otakCommitter.openaiApiKey', legacyKey);

            // Trigger migration by getting the key
            await manager.getApiKey('openai');

            // Legacy key should be cleaned up
            assert.strictEqual(
                configData.has('otakCommitter.openaiApiKey'),
                false,
                'Legacy key should be removed after migration',
            );
        });

        test('should handle migration failure gracefully', async () => {
            const failingMigrationContext = {
                secrets: {
                    get: async () => undefined,
                    store: async () => {
                        throw new Error('SecretStorage unavailable');
                    },
                    delete: async () => {},
                },
                globalState: {
                    get: () => undefined,
                    update: async () => {},
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            const manager = new StorageManager(failingMigrationContext);
            configData.set('otakCommitter.openaiApiKey', 'sk-legacy-key');

            // Should not return the legacy key if it cannot be migrated to SecretStorage.
            const retrieved = await manager.getApiKey('openai');
            assert.strictEqual(
                retrieved,
                undefined,
                'Should not return legacy key when migration fails',
            );
            assert.strictEqual(
                configData.get('otakCommitter.openaiApiKey'),
                'sk-legacy-key',
                'Legacy key should remain until secure storage is available',
            );
        });

        test('should migrate both OpenAI and GitHub keys', async () => {
            const manager = new StorageManager(migrationContext);

            configData.set('otakCommitter.openaiApiKey', 'sk-openai-legacy');
            configData.set('otakCommitter.githubToken', 'ghp-github-legacy');

            await manager.migrateFromLegacy();

            // Both keys should be migrated
            const openaiKey = await manager.getApiKey('openai');
            const githubKey = await manager.getApiKey('github');

            assert.strictEqual(openaiKey, 'sk-openai-legacy', 'OpenAI key should be migrated');
            assert.strictEqual(githubKey, 'ghp-github-legacy', 'GitHub key should be migrated');
        });

        test('should skip migration for empty legacy keys', async () => {
            const manager = new StorageManager(migrationContext);

            configData.set('otakCommitter.openaiApiKey', '');

            await manager.migrateFromLegacy();

            // Empty key should not be migrated
            const hasKey = await manager.hasApiKey('openai');
            assert.strictEqual(hasKey, false, 'Empty legacy key should not be migrated');
        });

        test('should only run migration once', async () => {
            const manager = new StorageManager(migrationContext);

            configData.set('otakCommitter.openaiApiKey', 'sk-test-key');

            // First migration
            await manager.migrateFromLegacy();
            assert.strictEqual(
                globalStateData.get('otak-committer.migrationCompleted'),
                true,
                'Migration flag should be set after first run',
            );

            // Add a new legacy key
            configData.set('otakCommitter.githubToken', 'ghp-new-key');

            // Second migration attempt
            await manager.migrateFromLegacy();

            // New key should NOT be in SecretStorage (migration skipped)
            const inSecretStorage = await migrationContext.secrets.get('github.apiKey');
            assert.strictEqual(
                inSecretStorage,
                undefined,
                'New legacy key should not be migrated to SecretStorage',
            );

            // hasApiKey still detects legacy keys so the UI can prompt for migration/setup.
            const hasGithubKey = await manager.hasApiKey('github');
            assert.strictEqual(
                hasGithubKey,
                true,
                'Legacy key should still be detected',
            );
        });
    });

    suite('Storage Failure Handling', () => {
        let testContext: vscode.ExtensionContext;
        let storedSecrets: Map<string, string>;
        let globalStateData: Map<string, any>;

        setup(() => {
            storedSecrets = new Map();
            globalStateData = new Map();

            testContext = {
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

        test('should not retrieve from legacy backup when SecretStorage content is missing', async () => {
            const manager = new StorageManager(testContext);
            const testKey = 'sk-no-backup-test-key';

            // Store the key first
            await manager.setApiKey('openai', testKey);

            // Simulate SecretStorage failure by clearing it
            storedSecrets.clear();

            const retrieved = await manager.getApiKey('openai');
            assert.strictEqual(retrieved, undefined, 'Should not retrieve from legacy backup');
        });

        test('should not restore to SecretStorage from legacy backup', async () => {
            const manager = new StorageManager(testContext);
            const testKey = 'sk-no-restore-test-key';

            // Store the key
            await manager.setApiKey('openai', testKey);

            // Clear SecretStorage to simulate failure
            storedSecrets.clear();

            await manager.getApiKey('openai');

            assert.strictEqual(
                storedSecrets.has('openai.apiKey'),
                false,
                'Key should not be restored from legacy backup',
            );
        });

        test('should handle corrupted backup gracefully', async () => {
            const manager = new StorageManager(testContext);

            // Set a corrupted backup
            globalStateData.set(
                'otak-committer.backup.openai.apiKey',
                'corrupted-data-not-encrypted',
            );

            // Should return undefined for corrupted backup
            const retrieved = await manager.getApiKey('openai');
            assert.strictEqual(
                retrieved,
                undefined,
                'Should return undefined for corrupted backup',
            );

            // Corrupted backup should be cleaned up
            assert.strictEqual(
                globalStateData.has('otak-committer.backup.openai.apiKey'),
                false,
                'Corrupted backup should be deleted',
            );
        });

        test('should not use legacy storage when SecretStorage is unavailable', async () => {
            const configData = new Map<string, any>();
            configData.set('otakCommitter.openaiApiKey', 'sk-legacy-fallback-key');

            // Mock workspace configuration
            (vscode.workspace as any).getConfiguration = (section?: string) => {
                return {
                    get: (key: string) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        return configData.get(fullKey);
                    },
                    update: async () => {},
                    has: () => false,
                    inspect: () => undefined,
                };
            };

            const failingContext = {
                secrets: {
                    get: async () => {
                        throw new Error('SecretStorage unavailable');
                    },
                    store: async () => {
                        throw new Error('SecretStorage unavailable');
                    },
                    delete: async () => {},
                },
                globalState: {
                    get: () => undefined,
                    update: async () => {},
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            const manager = new StorageManager(failingContext);
            const retrieved = await manager.getApiKey('openai');

            assert.strictEqual(
                retrieved,
                undefined,
                'Should not expose legacy key when SecretStorage is unavailable',
            );
        });

        test('should reject and not write plaintext fallback when SecretStorage fails', async () => {
            const configData = new Map<string, any>();

            (vscode.workspace as any).getConfiguration = (section?: string) => {
                return {
                    get: (key: string) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        return configData.get(fullKey);
                    },
                    update: async (key: string, value: any) => {
                        const fullKey = section ? `${section}.${key}` : key;
                        configData.set(fullKey, value);
                    },
                    has: () => false,
                    inspect: () => undefined,
                };
            };

            const failingContext = {
                secrets: {
                    get: async () => undefined,
                    store: async () => {
                        throw new Error('SecretStorage unavailable');
                    },
                    delete: async () => {},
                },
                globalState: {
                    get: () => undefined,
                    update: async () => {
                        throw new Error('GlobalState unavailable');
                    },
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            const manager = new StorageManager(failingContext);

            await assert.rejects(
                async () => await manager.setApiKey('openai', 'sk-fallback-key'),
                /Failed to store API key/,
                'Should reject when SecretStorage cannot store the key',
            );

            assert.strictEqual(
                configData.get('otakCommitter.openaiApiKey'),
                undefined,
                'Should not store API key in fallback configuration',
            );
        });

        test('should handle partial deletion gracefully', async () => {
            const manager = new StorageManager(testContext);

            await manager.setApiKey('openai', 'sk-test-key');

            // Make SecretStorage deletion fail
            const originalDelete = testContext.secrets.delete;
            testContext.secrets.delete = async () => {
                throw new Error('Deletion failed');
            };

            // Should not throw - partial deletion is acceptable
            await assert.doesNotReject(async () => {
                await manager.deleteApiKey('openai');
            });

            // Restore original
            testContext.secrets.delete = originalDelete;
        });
    });

    suite('Error Handling', () => {
        test('should return undefined when getApiKey encounters errors', async () => {
            const failingContext = {
                secrets: {
                    get: async () => {
                        throw new Error('Storage error');
                    },
                    store: async () => {},
                    delete: async () => {},
                },
                globalState: {
                    get: () => {
                        throw new Error('State error');
                    },
                    update: async () => {},
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            const manager = new StorageManager(failingContext);
            const key = await manager.getApiKey('openai');

            assert.strictEqual(key, undefined, 'Should return undefined on error');
        });

        test('should throw StorageError when all storage mechanisms fail', async () => {
            const failingContext = {
                secrets: {
                    get: async () => undefined,
                    store: async () => {
                        throw new Error('SecretStorage failed');
                    },
                    delete: async () => {},
                },
                globalState: {
                    get: () => undefined,
                    update: async () => {
                        throw new Error('GlobalState failed');
                    },
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            // Mock configuration to also fail
            (vscode.workspace as any).getConfiguration = () => {
                return {
                    get: () => undefined,
                    update: async () => {
                        throw new Error('Configuration failed');
                    },
                    has: () => false,
                    inspect: () => undefined,
                };
            };

            const manager = new StorageManager(failingContext);

            await assert.rejects(
                async () => await manager.setApiKey('openai', 'sk-test-key'),
                /Failed to store API key/,
                'Should throw StorageError when all mechanisms fail',
            );
        });

        test('should return false from hasApiKey on error', async () => {
            const failingContext = {
                secrets: {
                    get: async () => {
                        throw new Error('Storage error');
                    },
                    store: async () => {},
                    delete: async () => {},
                },
                globalState: {
                    get: () => undefined,
                    update: async () => {},
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            const manager = new StorageManager(failingContext);
            const hasKey = await manager.hasApiKey('openai');

            assert.strictEqual(hasKey, false, 'Should return false on error');
        });

        test('should throw StorageError when deleteApiKey fails completely', async () => {
            const failingContext = {
                secrets: {
                    get: async () => undefined,
                    store: async () => {},
                    delete: async () => {
                        throw new Error('SecretStorage delete failed');
                    },
                },
                globalState: {
                    get: () => undefined,
                    // GlobalState update must also fail so every deletion path fails.
                    update: async () => {
                        throw new Error('GlobalState update failed');
                    },
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            // Mock configuration to also fail
            (vscode.workspace as any).getConfiguration = () => {
                return {
                    get: () => undefined,
                    update: async () => {
                        throw new Error('Configuration delete failed');
                    },
                    has: () => false,
                    inspect: () => undefined,
                };
            };

            const manager = new StorageManager(failingContext);

            await assert.rejects(
                async () => await manager.deleteApiKey('openai'),
                /Failed to delete API key/,
                'Should throw StorageError when all deletion attempts fail',
            );
        });

        test('should handle setSecret errors', async () => {
            const failingContext = {
                secrets: {
                    get: async () => undefined,
                    store: async () => {
                        throw new Error('Storage failed');
                    },
                    delete: async () => {},
                },
                globalState: {
                    get: () => undefined,
                    update: async () => {
                        throw new Error('State failed');
                    },
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            const manager = new StorageManager(failingContext);

            await assert.rejects(
                async () => await manager.setSecret('test-key', 'test-value'),
                /Failed to store secret/,
                'Should throw StorageError for setSecret failure',
            );
        });

        test('should handle getSecret errors gracefully', async () => {
            const failingContext = {
                secrets: {
                    get: async () => {
                        throw new Error('Storage failed');
                    },
                    store: async () => {},
                    delete: async () => {},
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

            assert.strictEqual(value, undefined, 'Should return undefined on error');
        });

        test('should not throw when deleteSecret fails', async () => {
            const failingContext = {
                secrets: {
                    get: async () => undefined,
                    store: async () => {},
                    delete: async () => {
                        throw new Error('Delete failed');
                    },
                },
                globalState: {
                    get: () => undefined,
                    update: async () => {
                        throw new Error('State failed');
                    },
                    keys: () => [],
                    setKeysForSync: () => {},
                },
            } as any;

            const manager = new StorageManager(failingContext);

            await assert.doesNotReject(
                async () => await manager.deleteSecret('test-key'),
                'Should not throw when deleteSecret fails',
            );
        });
    });
});
