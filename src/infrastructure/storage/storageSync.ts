import * as vscode from 'vscode';
import { ConfigStorageProvider } from './ConfigStorageProvider';
import { SecretStorageProvider } from './SecretStorageProvider';
import { SyncedStateProvider } from './SyncedStateProvider';
import { ServiceProvider } from '../../types/enums/ServiceProvider';
import { Logger } from '../logging/Logger';

const ALWAYS_STAGE_ALL_KEY = 'otak-committer.alwaysStageAll';

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
    setKeysForSync(context, logger, keys);
}

export async function configureSettingsSync(
    context: vscode.ExtensionContext,
    _secretStorage: SecretStorageProvider,
    syncedState: SyncedStateProvider,
    _configStorage: ConfigStorageProvider,
    logger: Logger,
): Promise<void> {
    registerKeysForSync(context, logger);

    const services: ServiceProvider[] = [ServiceProvider.OpenAI, ServiceProvider.GitHub];
    for (const service of services) {
        try {
            await syncedState.deleteApiKey(service);
        } catch (error) {
            logger.error(`[StorageManager] Failed to remove ${service} API key from Settings Sync`, error);
        }
    }
}
