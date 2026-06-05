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

/**
 * Register the extension's globalState keys that should participate in Settings Sync
 *
 * @param context - The VS Code extension context whose globalState is configured
 * @param logger - Logger used to record sync registration failures
 */
export function registerKeysForSync(context: vscode.ExtensionContext, logger: Logger): void {
    const keys: string[] = [ALWAYS_STAGE_ALL_KEY];
    setKeysForSync(context, logger, keys);
}

/**
 * Configure Settings Sync by registering synced keys and clearing any synced API keys
 *
 * @param context - The VS Code extension context whose globalState is configured
 * @param _secretStorage - Reserved for future use
 * @param syncedState - Provider used to remove API keys from synced state
 * @param _configStorage - Reserved for future use
 * @param logger - Logger used to record sync configuration failures
 */
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
