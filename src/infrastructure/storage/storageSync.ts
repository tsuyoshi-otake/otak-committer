import * as vscode from 'vscode';
import { ConfigStorageProvider } from './ConfigStorageProvider';
import { SecretStorageProvider } from './SecretStorageProvider';
import { SyncedStateProvider } from './SyncedStateProvider';
import { StorageMigrationService } from './StorageMigrationService';
import { ServiceProvider } from '../../types/enums/ServiceProvider';
import { Logger } from '../logging/Logger';

export const ALWAYS_STAGE_ALL_KEY = 'otak-committer.alwaysStageAll';

export function isApiKeySyncEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('otakCommitter');
    return config.get<boolean>('syncApiKeys') === true;
}

function setKeysForSync(
    context: vscode.ExtensionContext,
    logger: Logger,
    keys: readonly string[],
): void {
    const memento = context.globalState as vscode.Memento & {
        setKeysForSync?: (nextKeys: readonly string[]) => void;
    };

    if (typeof memento.setKeysForSync !== 'function') {
        return;
    }

    try {
        memento.setKeysForSync(keys);
    } catch (error) {
        logger.warning('[StorageManager] Failed to register keys for Settings Sync', error);
    }
}

export function registerKeysForSync(context: vscode.ExtensionContext, logger: Logger): void {
    const keys: string[] = [ALWAYS_STAGE_ALL_KEY];

    if (isApiKeySyncEnabled()) {
        keys.push(
            SyncedStateProvider.getApiKeyKey(ServiceProvider.OpenAI),
            SyncedStateProvider.getApiKeyKey(ServiceProvider.GitHub),
        );
    }

    setKeysForSync(context, logger, keys);
}

export async function configureSettingsSync(
    context: vscode.ExtensionContext,
    secretStorage: SecretStorageProvider,
    syncedState: SyncedStateProvider,
    configStorage: ConfigStorageProvider,
    logger: Logger,
): Promise<void> {
    registerKeysForSync(context, logger);

    if (!isApiKeySyncEnabled()) {
        return;
    }

    const services: ServiceProvider[] = [ServiceProvider.OpenAI, ServiceProvider.GitHub];
    for (const service of services) {
        const secretKey = `${service}.apiKey`;
        const localValue = (await secretStorage.get(secretKey))?.trim();

        if (localValue) {
            try {
                await syncedState.setApiKey(service, localValue);
            } catch (error) {
                logger.error(
                    `[StorageManager] Failed to publish ${service} API key to Settings Sync`,
                    error,
                );
            }
            continue;
        }

        const syncedValue = syncedState.getApiKey(service)?.trim();
        if (!syncedValue) {
            continue;
        }

        logger.info(
            `[StorageManager] Restoring ${service} API key from Settings Sync to SecretStorage`,
        );

        try {
            await secretStorage.set(secretKey, syncedValue);
        } catch (error) {
            logger.error(`[StorageManager] Failed to restore ${service} API key to SecretStorage`, error);
        }

        try {
            const legacyKey = StorageMigrationService.getLegacyConfigKey(service);
            await configStorage.delete(legacyKey);
        } catch (error) {
            logger.error(
                '[StorageManager] Failed to clean up legacy storage after Settings Sync restore',
                error,
            );
        }
    }
}
