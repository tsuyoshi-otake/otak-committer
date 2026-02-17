import * as vscode from 'vscode';
import { ConfigStorageProvider } from './ConfigStorageProvider';
import { ServiceProvider } from '../../types/enums/ServiceProvider';
import { Logger } from '../logging/Logger';

/**
 * Handles migration of data from legacy Configuration storage to SecretStorage
 */
export class StorageMigrationService {
    private static readonly MIGRATION_FLAG_KEY = 'otak-committer.migrationCompleted';
    private readonly logger: Logger;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configStorage: ConfigStorageProvider,
        private readonly setApiKey: (service: ServiceProvider, value: string) => Promise<void>
    ) {
        this.logger = Logger.getInstance();
    }

    /**
     * Migrates data from legacy Configuration storage to SecretStorage
     *
     * This method automatically runs during extension activation to migrate
     * API keys from the old plain-text Configuration storage to the new
     * encrypted SecretStorage.
     */
    async migrateFromLegacy(): Promise<void> {
        try {
            const migrationCompleted = this.context.globalState.get<boolean>(
                StorageMigrationService.MIGRATION_FLAG_KEY
            );

            if (migrationCompleted) {
                this.logger.debug('[StorageManager] Migration already completed, skipping');
                return;
            }

            this.logger.info('[StorageManager] Starting legacy data migration...');

            await this.migrateLegacyKey(ServiceProvider.OpenAI, 'otakCommitter.openaiApiKey');
            await this.migrateLegacyKey(ServiceProvider.GitHub, 'otakCommitter.githubToken');

            await this.context.globalState.update(StorageMigrationService.MIGRATION_FLAG_KEY, true);

            this.logger.info('[StorageManager] Legacy data migration completed');

            vscode.window.showInformationMessage(
                'otak-committer: API keys have been migrated to secure storage.'
            );
        } catch (error) {
            this.logger.error('[StorageManager] Migration failed', error);
        }
    }

    /**
     * Migrates a single legacy key from Configuration to SecretStorage with fallback
     */
    async migrateLegacyKey(
        service: ServiceProvider,
        legacyConfigKey: string
    ): Promise<void> {
        try {
            const legacyValue = await this.configStorage.get(legacyConfigKey);

            if (!legacyValue || legacyValue.trim() === '') {
                return;
            }

            this.logger.info(`[StorageManager] Migrating ${service} API key from legacy storage`);

            try {
                await this.setApiKey(service, legacyValue);
                await this.configStorage.delete(legacyConfigKey);
                this.logger.info(`[StorageManager] Successfully migrated ${service} API key`);
            } catch (migrationError) {
                this.logger.error(`[StorageManager] Failed to migrate ${service} key`, migrationError);
                this.logger.info(`[StorageManager] Keeping ${service} API key in legacy storage as fallback`);
                vscode.window.showWarningMessage(
                    `otak-committer: Failed to migrate ${service} API key to secure storage. Using fallback storage.`
                );
            }
        } catch (error) {
            this.logger.error(`[StorageManager] Failed to check/migrate ${service} key`, error);
        }
    }

    /**
     * Gets the legacy configuration key for a service
     */
    static getLegacyConfigKey(service: ServiceProvider): string {
        switch (service) {
            case 'openai':
                return 'otakCommitter.openaiApiKey';
            case 'github':
                return 'otakCommitter.githubToken';
            default:
                return `otakCommitter.${service}ApiKey`;
        }
    }

    /**
     * Check if migration has been completed
     */
    get migrationCompleted(): boolean {
        return this.context.globalState.get<boolean>(
            StorageMigrationService.MIGRATION_FLAG_KEY
        ) ?? false;
    }
}
