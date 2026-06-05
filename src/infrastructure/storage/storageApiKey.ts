import { ConfigStorageProvider } from './ConfigStorageProvider';
import { SecretStorageProvider } from './SecretStorageProvider';
import { SyncedStateProvider } from './SyncedStateProvider';
import { StorageMigrationService } from './StorageMigrationService';
import { StorageError } from '../../types/errors';
import { ServiceProvider } from '../../types/enums/ServiceProvider';
import { Logger } from '../logging/Logger';

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
    const { secretStorage, configStorage, logger } = context;

    try {
        const key = `${service}.apiKey`;
        const value = await secretStorage.get(key);
        if (value && value.trim() !== '') {
            return value;
        }

        const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
        const legacyValue = await configStorage.get(legacyKey);
        if (legacyValue && legacyValue.trim() !== '') {
            logger.info(`Found API key in legacy storage for ${service}, migrating...`);

            try {
                await setApiKey(context, service, legacyValue);
                await configStorage.delete(legacyKey);
                logger.info(`Successfully migrated ${service} API key`);
                return legacyValue;
            } catch (migrationError) {
                logger.error(`Failed to migrate ${service} key`, migrationError);
                return undefined;
            }
        }

        return undefined;
    } catch (error) {
        logger.error(`Error retrieving API key for ${service}`, error);
        return undefined;
    }
}

export async function setApiKey(
    context: ApiKeyStorageContext,
    service: ServiceProvider,
    value: string,
): Promise<void> {
    const { secretStorage, configStorage, logger, registerKeysForSync } = context;

    try {
        const key = `${service}.apiKey`;
        await secretStorage.set(key, value);

        registerKeysForSync();

        try {
            const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
            await configStorage.delete(legacyKey);
        } catch (cleanupError) {
            logger.error('Failed to clean up legacy storage', cleanupError);
        }
    } catch (error) {
        logger.error(`Error storing API key for ${service}`, error);

        throw new StorageError(`Failed to store API key for service: ${service}`, {
            service,
            originalError: error,
        });
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
    const { secretStorage, configStorage, logger } = context;
    try {
        const key = `${service}.apiKey`;
        const hasInSecret = await secretStorage.has(key);
        if (hasInSecret) {
            return true;
        }

        const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
        return await configStorage.has(legacyKey);
    } catch (error) {
        logger.error(`Error checking API key for ${service}`, error);
        return false;
    }
}
