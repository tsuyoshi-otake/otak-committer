import * as vscode from 'vscode';
import { ServiceProvider } from '../../types/enums/ServiceProvider';
import { Logger } from '../logging/Logger';

/**
 * Provides Settings Sync-backed storage using `globalState` + `setKeysForSync`.
 *
 * Notes:
 * - Values stored here are part of VS Code Settings Sync (extension state) when the
 *   corresponding keys are registered via `setKeysForSync`.
 * - This is intended for opt-in syncing of API keys across devices.
 * - Unlike SecretStorage, this storage is not guaranteed to be encrypted at rest
 *   by the OS keychain, so treat it as less secure.
 */
export class SyncedStateProvider {
    private static readonly PREFIX = 'otak-committer.sync.';
    private readonly logger: Logger;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.logger = Logger.getInstance();
    }

    /**
     * Returns the Settings Sync storage key for a service API key.
     */
    static getApiKeyKey(service: ServiceProvider): string {
        return `${SyncedStateProvider.PREFIX}${service}.apiKey`;
    }

    /**
     * Retrieves the synced API key for a service.
     */
    getApiKey(service: ServiceProvider): string | undefined {
        const storageKey = SyncedStateProvider.getApiKeyKey(service);
        const value = this.context.globalState.get<string>(storageKey);
        if (typeof value !== 'string' || !value.trim()) {
            return undefined;
        }
        return value;
    }

    /**
     * Stores the API key in synced extension state.
     *
     * This stores the trimmed value and deletes the key when it is empty.
     */
    async setApiKey(service: ServiceProvider, value: string): Promise<void> {
        const trimmed = value.trim();
        if (!trimmed) {
            await this.deleteApiKey(service);
            return;
        }

        const storageKey = SyncedStateProvider.getApiKeyKey(service);
        await this.context.globalState.update(storageKey, trimmed);
        this.logger.debug(`[SyncedStateProvider] Stored API key in synced state for ${service}`);
    }

    /**
     * Deletes the synced API key for a service.
     */
    async deleteApiKey(service: ServiceProvider): Promise<void> {
        const storageKey = SyncedStateProvider.getApiKeyKey(service);
        await this.context.globalState.update(storageKey, undefined);
        this.logger.debug(`[SyncedStateProvider] Deleted API key from synced state for ${service}`);
    }

    /**
     * Checks if a synced API key exists for a service.
     */
    hasApiKey(service: ServiceProvider): boolean {
        return this.getApiKey(service) !== undefined;
    }
}
