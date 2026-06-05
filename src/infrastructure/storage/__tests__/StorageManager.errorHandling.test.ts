import * as assert from 'assert';
import * as vscode from 'vscode';
import { StorageManager } from '../StorageManager';
import { createFailingStorageContext } from './storageTestHelpers';

suite('StorageManager Error Handling', () => {
    test('should return undefined when getApiKey encounters errors', async () => {
        const failingContext = createFailingStorageContext({
            secretGet: async () => {
                throw new Error('Storage error');
            },
            stateGet: () => {
                throw new Error('State error');
            },
        });

        const manager = new StorageManager(failingContext);
        const key = await manager.getApiKey('openai');

        assert.strictEqual(key, undefined, 'Should return undefined on error');
    });

    test('should throw StorageError when all storage mechanisms fail', async () => {
        const failingContext = createFailingStorageContext({
            secretStore: async () => {
                throw new Error('SecretStorage failed');
            },
            stateUpdate: async () => {
                throw new Error('GlobalState failed');
            },
        });

        (vscode.workspace as any).getConfiguration = () => ({
            get: () => undefined,
            update: async () => {
                throw new Error('Configuration failed');
            },
            has: () => false,
            inspect: () => undefined,
        });

        const manager = new StorageManager(failingContext);

        await assert.rejects(
            async () => await manager.setApiKey('openai', 'sk-test-key'),
            /Failed to store API key/,
            'Should throw StorageError when all mechanisms fail',
        );
    });

    test('should return false from hasApiKey on error', async () => {
        const failingContext = createFailingStorageContext({
            secretGet: async () => {
                throw new Error('Storage error');
            },
        });

        const manager = new StorageManager(failingContext);
        const hasKey = await manager.hasApiKey('openai');

        assert.strictEqual(hasKey, false, 'Should return false on error');
    });

    test('should throw StorageError when deleteApiKey fails completely', async () => {
        const failingContext = createFailingStorageContext({
            secretDelete: async () => {
                throw new Error('SecretStorage delete failed');
            },
            stateUpdate: async () => {
                throw new Error('GlobalState update failed');
            },
        });

        (vscode.workspace as any).getConfiguration = () => ({
            get: () => undefined,
            update: async () => {
                throw new Error('Configuration delete failed');
            },
            has: () => false,
            inspect: () => undefined,
        });

        const manager = new StorageManager(failingContext);

        await assert.rejects(
            async () => await manager.deleteApiKey('openai'),
            /Failed to delete API key/,
            'Should throw StorageError when all deletion attempts fail',
        );
    });

    test('should handle setSecret errors', async () => {
        const failingContext = createFailingStorageContext({
            secretStore: async () => {
                throw new Error('Storage failed');
            },
            stateUpdate: async () => {
                throw new Error('State failed');
            },
        });

        const manager = new StorageManager(failingContext);

        await assert.rejects(
            async () => await manager.setSecret('test-key', 'test-value'),
            /Failed to store secret/,
            'Should throw StorageError for setSecret failure',
        );
    });

    test('should handle getSecret errors gracefully', async () => {
        const failingContext = createFailingStorageContext({
            secretGet: async () => {
                throw new Error('Storage failed');
            },
        });

        const manager = new StorageManager(failingContext);
        const value = await manager.getSecret('test-key');

        assert.strictEqual(value, undefined, 'Should return undefined on error');
    });

    test('should not throw when deleteSecret fails', async () => {
        const failingContext = createFailingStorageContext({
            secretDelete: async () => {
                throw new Error('Delete failed');
            },
            stateUpdate: async () => {
                throw new Error('State failed');
            },
        });

        const manager = new StorageManager(failingContext);

        await assert.doesNotReject(
            async () => await manager.deleteSecret('test-key'),
            'Should not throw when deleteSecret fails',
        );
    });
});
