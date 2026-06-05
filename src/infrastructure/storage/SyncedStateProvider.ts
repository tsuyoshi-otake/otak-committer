import * as vscode from 'vscode';
import { ServiceProvider } from '../../types/enums/ServiceProvider';
import { Logger } from '../logging/Logger';

/**
 * Provides cleanup access for legacy Settings Sync-backed API key storage.
 *
 * Notes:
 * - API keys must not be stored in Settings Sync because extension state is not
 *   protected by VS Code SecretStorage.
 * - This class remains to remove values written by older extension versions.
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
     * Refuses to store API keys in synced extension state.
     */
    async setApiKey(service: ServiceProvider, _value: string): Promise<void> {
        await this.deleteApiKey(service);
        this.logger.warning(
            `[SyncedStateProvider] Refused to store API key in synced state for ${service}`,
        );
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
