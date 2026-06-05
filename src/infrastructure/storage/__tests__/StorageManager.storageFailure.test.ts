import * as assert from 'assert';
import { StorageManager } from '../StorageManager';
import {
    createFailingStorageContext,
    createStorageTestContext,
    mockWorkspaceConfiguration,
    StorageTestContext,
} from './storageTestHelpers';

suite('StorageManager Storage Failure Handling', () => {
    let storage: StorageTestContext;
    let manager: StorageManager;

    setup(() => {
        storage = createStorageTestContext();
        manager = new StorageManager(storage.context);
    });

    test('should not retrieve from legacy backup when SecretStorage content is missing', async () => {
        const testKey = 'sk-no-backup-test-key';

        await manager.setApiKey('openai', testKey);
        storage.storedSecrets.clear();

        const retrieved = await manager.getApiKey('openai');
        assert.strictEqual(retrieved, undefined, 'Should not retrieve from legacy backup');
    });

    test('should not restore to SecretStorage from legacy backup', async () => {
        const testKey = 'sk-no-restore-test-key';

        await manager.setApiKey('openai', testKey);
        storage.storedSecrets.clear();

        await manager.getApiKey('openai');

        assert.strictEqual(
            storage.storedSecrets.has('openai.apiKey'),
            false,
            'Key should not be restored from legacy backup',
        );
    });

    test('should handle corrupted backup gracefully', async () => {
        storage.globalStateData.set(
            'otak-committer.backup.openai.apiKey',
            'corrupted-data-not-encrypted',
        );

        const retrieved = await manager.getApiKey('openai');
        assert.strictEqual(retrieved, undefined, 'Should return undefined for corrupted backup');

        assert.strictEqual(
            storage.globalStateData.has('otak-committer.backup.openai.apiKey'),
            false,
            'Corrupted backup should be deleted',
        );
    });

    test('should not use legacy storage when SecretStorage is unavailable', async () => {
        const configData = new Map<string, any>();
        configData.set('otakCommitter.openaiApiKey', 'sk-legacy-fallback-key');
        mockWorkspaceConfiguration(configData, { has: () => false });

        const failingContext = createFailingStorageContext({
            secretGet: async () => {
                throw new Error('SecretStorage unavailable');
            },
            secretStore: async () => {
                throw new Error('SecretStorage unavailable');
            },
        });

        const failingManager = new StorageManager(failingContext);
        const retrieved = await failingManager.getApiKey('openai');

        assert.strictEqual(
            retrieved,
            undefined,
            'Should not expose legacy key when SecretStorage is unavailable',
        );
    });

    test('should reject and not write plaintext fallback when SecretStorage fails', async () => {
        const configData = new Map<string, any>();
        mockWorkspaceConfiguration(configData, {
            has: () => false,
            update: async (_key, value, fullKey) => {
                configData.set(fullKey, value);
            },
        });

        const failingContext = createFailingStorageContext({
            secretStore: async () => {
                throw new Error('SecretStorage unavailable');
            },
            stateUpdate: async () => {
                throw new Error('GlobalState unavailable');
            },
        });
        const failingManager = new StorageManager(failingContext);

        await assert.rejects(
            async () => await failingManager.setApiKey('openai', 'sk-fallback-key'),
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
        await manager.setApiKey('openai', 'sk-test-key');

        const originalDelete = storage.context.secrets.delete;
        storage.context.secrets.delete = async () => {
            throw new Error('Deletion failed');
        };

        await assert.doesNotReject(async () => {
            await manager.deleteApiKey('openai');
        });

        storage.context.secrets.delete = originalDelete;
    });
});
