import * as assert from 'assert';
import { StorageManager } from '../StorageManager';
import { createStorageTestContext } from './storageTestHelpers';

/**
 * Unit tests for StorageManager construction and public API.
 */
suite('StorageManager', () => {
    let storageManager: StorageManager;

    setup(() => {
        const storage = createStorageTestContext();
        storageManager = new StorageManager(storage.context);
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
});
