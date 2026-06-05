import * as assert from 'assert';
import { StorageManager } from '../StorageManager';
import { createStorageTestContext, StorageTestContext } from './storageTestHelpers';

suite('StorageManager API Key Storage and Retrieval', () => {
    let storage: StorageTestContext;
    let manager: StorageManager;

    setup(() => {
        storage = createStorageTestContext();
        manager = new StorageManager(storage.context);
    });

    test('should store and retrieve OpenAI API key', async () => {
        const testKey = 'sk-test-openai-key-12345';

        await manager.setApiKey('openai', testKey);
        const retrieved = await manager.getApiKey('openai');

        assert.strictEqual(retrieved, testKey, 'Retrieved key should match stored key');
        assert.ok(storage.storedSecrets.has('openai.apiKey'), 'Key should be in SecretStorage');
    });

    test('should store and retrieve GitHub API key', async () => {
        const testKey = 'ghp_test-github-token-67890';

        await manager.setApiKey('github', testKey);
        const retrieved = await manager.getApiKey('github');

        assert.strictEqual(retrieved, testKey, 'Retrieved key should match stored key');
        assert.ok(storage.storedSecrets.has('github.apiKey'), 'Key should be in SecretStorage');
    });

    test('should return undefined for non-existent API key', async () => {
        const retrieved = await manager.getApiKey('openai');

        assert.strictEqual(retrieved, undefined, 'Should return undefined for non-existent key');
    });

    test('should not store API key backup in GlobalState', async () => {
        const testKey = 'sk-test-key-without-backup';

        await manager.setApiKey('openai', testKey);

        const backupKey = 'otak-committer.backup.openai.apiKey';

        assert.strictEqual(
            storage.globalStateData.has(backupKey),
            false,
            'API key backup should not exist in GlobalState',
        );
        assert.strictEqual(
            Array.from(storage.globalStateData.values()).includes(testKey),
            false,
            'API key should not be stored in GlobalState',
        );
    });

    test('should delete API key from all storage locations', async () => {
        const testKey = 'sk-test-key-to-delete';

        await manager.setApiKey('openai', testKey);
        assert.ok(storage.storedSecrets.has('openai.apiKey'), 'Key should exist before deletion');

        await manager.deleteApiKey('openai');

        assert.strictEqual(
            storage.storedSecrets.has('openai.apiKey'),
            false,
            'Key should be deleted from SecretStorage',
        );
        const retrieved = await manager.getApiKey('openai');
        assert.strictEqual(retrieved, undefined, 'Key should not be retrievable after deletion');
    });

    test('should correctly report if API key exists', async () => {
        let hasKey = await manager.hasApiKey('openai');
        assert.strictEqual(hasKey, false, 'Should return false when key does not exist');

        await manager.setApiKey('openai', 'sk-test-key');
        hasKey = await manager.hasApiKey('openai');
        assert.strictEqual(hasKey, true, 'Should return true when key exists');
    });

    test('should handle empty string API keys', async () => {
        await manager.setApiKey('openai', '');
        const retrieved = await manager.getApiKey('openai');

        assert.strictEqual(retrieved, undefined, 'Empty string should be treated as no key');
    });

    test('should handle whitespace-only API keys', async () => {
        await manager.setApiKey('openai', '   ');
        const retrieved = await manager.getApiKey('openai');

        assert.strictEqual(
            retrieved,
            undefined,
            'Whitespace-only string should be treated as no key',
        );
    });

    test('should store multiple API keys independently', async () => {
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
        const oldKey = 'sk-old-key';
        const newKey = 'sk-new-key';

        await manager.setApiKey('openai', oldKey);
        await manager.setApiKey('openai', newKey);

        const retrieved = await manager.getApiKey('openai');
        assert.strictEqual(retrieved, newKey, 'Should retrieve the new key');
    });
});
