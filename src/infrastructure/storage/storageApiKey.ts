import * as vscode from 'vscode';
import { ConfigStorageProvider } from './ConfigStorageProvider';
import { SecretStorageProvider } from './SecretStorageProvider';
import { SyncedStateProvider } from './SyncedStateProvider';
import { StorageMigrationService } from './StorageMigrationService';
import { StorageError } from '../../types/errors';
import { ServiceProvider } from '../../types/enums/ServiceProvider';
import { Logger } from '../logging/Logger';
import { t } from '../../i18n';
import { isApiKeySyncEnabled } from './storageSync';

interface ApiKeyStorageContext {
    secretStorage: SecretStorageProvider;
    syncedState: SyncedStateProvider;
    configStorage: ConfigStorageProvider;
    logger: Logger;
    registerKeysForSync: () => void;
}

export async function getApiKey(
    context: ApiKeyStorageContext,
    service: ServiceProvider,
): Promise<string | undefined> {
    const { secretStorage, syncedState, configStorage, logger } = context;

    try {
        const key = `${service}.apiKey`;
        const value = await secretStorage.get(key);
        if (value && value.trim() !== '') {
            return value;
        }

        if (isApiKeySyncEnabled()) {
            const syncedValue = syncedState.getApiKey(service);
            if (syncedValue && syncedValue.trim() !== '') {
                try {
                    await secretStorage.set(key, syncedValue);
                } catch (restoreError) {
                    logger.error(
                        `[StorageManager] Failed to restore ${service} API key from Settings Sync`,
                        restoreError,
                    );
                }
                return syncedValue;
            }
        }

        const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
        const legacyValue = await configStorage.get(legacyKey);
        if (legacyValue && legacyValue.trim() !== '') {
            logger.info(`Found API key in legacy storage for ${service}, migrating...`);

            try {
                await setApiKey(context, service, legacyValue);
                await configStorage.delete(legacyKey);
                logger.info(`Successfully migrated ${service} API key`);
            } catch (migrationError) {
                logger.error(`Failed to migrate ${service} key`, migrationError);
            }

            return legacyValue;
        }

        return undefined;
    } catch (error) {
        logger.error(`Error retrieving API key for ${service}`, error);

        if (isApiKeySyncEnabled()) {
            try {
                const syncedValue = syncedState.getApiKey(service);
                if (syncedValue && syncedValue.trim() !== '') {
                    logger.info(`Falling back to Settings Sync for ${service}`);
                    return syncedValue;
                }
            } catch (syncFallbackError) {
                logger.error('Settings Sync fallback retrieval also failed', syncFallbackError);
            }
        }

        try {
            const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
            const legacyValue = await configStorage.get(legacyKey);
            if (legacyValue && legacyValue.trim() !== '') {
                logger.info(`Falling back to legacy storage for ${service}`);
                return legacyValue;
            }
        } catch (fallbackError) {
            logger.error('Fallback retrieval also failed', fallbackError);
        }

        return undefined;
    }
}

export async function setApiKey(
    context: ApiKeyStorageContext,
    service: ServiceProvider,
    value: string,
): Promise<void> {
    const { secretStorage, syncedState, configStorage, logger, registerKeysForSync } = context;

    try {
        const key = `${service}.apiKey`;
        await secretStorage.set(key, value);

        if (isApiKeySyncEnabled()) {
            try {
                registerKeysForSync();
                await syncedState.setApiKey(service, value);
            } catch (syncError) {
                logger.error(
                    `[StorageManager] Failed to store ${service} API key in Settings Sync state`,
                    syncError,
                );
            }
        }

        try {
            const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
            await configStorage.delete(legacyKey);
        } catch (cleanupError) {
            logger.error('Failed to clean up legacy storage', cleanupError);
        }
    } catch (error) {
        logger.error(`Error storing API key for ${service}`, error);

        if (isApiKeySyncEnabled()) {
            try {
                registerKeysForSync();
                await syncedState.setApiKey(service, value);
            } catch (syncError) {
                logger.error(
                    `[StorageManager] Failed to store ${service} API key in Settings Sync state`,
                    syncError,
                );
            }
        }

        try {
            const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
            await configStorage.set(legacyKey, value);
            logger.info(`Stored ${service} API key in legacy storage as fallback`);
            vscode.window.showWarningMessage(t('messages.storageFallbackWarning'));
        } catch (fallbackError) {
            logger.error('Fallback storage also failed', fallbackError);
            throw new StorageError(
                `Failed to store API key for service: ${service}. All storage mechanisms failed.`,
                { service, originalError: error, fallbackError },
            );
        }
    }
}

export async function deleteApiKey(
    context: ApiKeyStorageContext,
    service: ServiceProvider,
): Promise<void> {
    const { secretStorage, syncedState, configStorage, logger } = context;
    const errors: unknown[] = [];

    try {
        const key = `${service}.apiKey`;
        await secretStorage.delete(key);
    } catch (error) {
        logger.error(`Error deleting API key from SecretStorage for ${service}`, error);
        errors.push(error);
    }

    try {
        await syncedState.deleteApiKey(service);
    } catch (error) {
        logger.error(`Error deleting API key from Settings Sync for ${service}`, error);
        errors.push(error);
    }

    try {
        const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
        await configStorage.delete(legacyKey);
    } catch (error) {
        logger.error(`Error deleting API key from legacy storage for ${service}`, error);
        errors.push(error);
    }

    if (errors.length === 3) {
        throw new StorageError(
            `Failed to delete API key for service: ${service} from all storage locations`,
            {
                service,
                errors: errors.map((e) => (e instanceof Error ? e.message : String(e))),
            },
        );
    }

    if (errors.length > 0) {
        logger.info(`Partially deleted API key for ${service} (some locations failed)`);
    }
}

export async function hasApiKey(
    context: ApiKeyStorageContext,
    service: ServiceProvider,
): Promise<boolean> {
    const { secretStorage, syncedState, configStorage, logger } = context;
    try {
        const key = `${service}.apiKey`;
        const hasInSecret = await secretStorage.has(key);
        if (hasInSecret) {
            return true;
        }

        if (isApiKeySyncEnabled() && syncedState.hasApiKey(service)) {
            return true;
        }

        const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
        return await configStorage.has(legacyKey);
    } catch (error) {
        logger.error(`Error checking API key for ${service}`, error);
        return false;
    }
}
