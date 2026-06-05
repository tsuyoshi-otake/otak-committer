import * as assert from 'assert';
import { StorageManager } from '../StorageManager';
import {
    createFailingStorageContext,
    createStorageTestContext,
    mockWorkspaceConfiguration,
    StorageTestContext,
} from './storageTestHelpers';

suite('StorageManager Migration Scenarios', () => {
    let storage: StorageTestContext;
    let manager: StorageManager;
    let configData: Map<string, any>;

    setup(() => {
        storage = createStorageTestContext();
        configData = new Map();
        mockWorkspaceConfiguration(configData);
        manager = new StorageManager(storage.context);
    });

    test('should detect when migration is not needed', async () => {
        storage.globalStateData.set('otak-committer.migrationCompleted', true);

        await manager.migrateFromLegacy();

        assert.strictEqual(
            storage.storedSecrets.size,
            0,
            'No secrets should be stored when migration already completed',
        );
    });

    test('should set migration completion flag', async () => {
        await manager.migrateFromLegacy();

        assert.strictEqual(
            storage.globalStateData.get('otak-committer.migrationCompleted'),
            true,
            'Migration completion flag should be set',
        );
    });

    test('should not throw error if migration fails', async () => {
        const failingContext = createFailingStorageContext({
            secretGet: async () => {
                throw new Error('Storage error');
            },
            secretStore: async () => {
                throw new Error('Storage error');
            },
            secretDelete: async () => {
                throw new Error('Storage error');
            },
            stateUpdate: async () => {
                throw new Error('State error');
            },
        });
        const failingManager = new StorageManager(failingContext);

        await assert.doesNotReject(async () => {
            await failingManager.migrateFromLegacy();
        });
    });

    test('should migrate from legacy configuration when key exists', async () => {
        const legacyKey = 'sk-legacy-key-12345';

        configData.set('otakCommitter.openaiApiKey', legacyKey);

        const retrieved = await manager.getApiKey('openai');

        assert.strictEqual(retrieved, legacyKey, 'Should retrieve legacy key');
        assert.ok(
            storage.storedSecrets.has('openai.apiKey'),
            'Key should be migrated to SecretStorage',
        );
    });

    test('should clean up legacy storage after successful migration', async () => {
        const legacyKey = 'sk-legacy-key-to-cleanup';

        configData.set('otakCommitter.openaiApiKey', legacyKey);

        await manager.getApiKey('openai');

        assert.strictEqual(
            configData.has('otakCommitter.openaiApiKey'),
            false,
            'Legacy key should be removed after migration',
        );
    });

    test('should handle migration failure gracefully', async () => {
        const failingMigrationContext = createFailingStorageContext({
            secretStore: async () => {
                throw new Error('SecretStorage unavailable');
            },
        });
        const failingManager = new StorageManager(failingMigrationContext);
        configData.set('otakCommitter.openaiApiKey', 'sk-legacy-key');

        const retrieved = await failingManager.getApiKey('openai');
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
        configData.set('otakCommitter.openaiApiKey', 'sk-openai-legacy');
        configData.set('otakCommitter.githubToken', 'ghp-github-legacy');

        await manager.migrateFromLegacy();

        const openaiKey = await manager.getApiKey('openai');
        const githubKey = await manager.getApiKey('github');

        assert.strictEqual(openaiKey, 'sk-openai-legacy', 'OpenAI key should be migrated');
        assert.strictEqual(githubKey, 'ghp-github-legacy', 'GitHub key should be migrated');
    });

    test('should skip migration for empty legacy keys', async () => {
        configData.set('otakCommitter.openaiApiKey', '');

        await manager.migrateFromLegacy();

        const hasKey = await manager.hasApiKey('openai');
        assert.strictEqual(hasKey, false, 'Empty legacy key should not be migrated');
    });

    test('should only run migration once', async () => {
        configData.set('otakCommitter.openaiApiKey', 'sk-test-key');

        await manager.migrateFromLegacy();
        assert.strictEqual(
            storage.globalStateData.get('otak-committer.migrationCompleted'),
            true,
            'Migration flag should be set after first run',
        );

        configData.set('otakCommitter.githubToken', 'ghp-new-key');

        await manager.migrateFromLegacy();

        const inSecretStorage = await storage.context.secrets.get('github.apiKey');
        assert.strictEqual(
            inSecretStorage,
            undefined,
            'New legacy key should not be migrated to SecretStorage',
        );

        const hasGithubKey = await manager.hasApiKey('github');
        assert.strictEqual(hasGithubKey, true, 'Legacy key should still be detected');
    });
});
