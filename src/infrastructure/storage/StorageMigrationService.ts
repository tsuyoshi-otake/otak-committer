import * as vscode from 'vscode';
import { ConfigStorageProvider } from './ConfigStorageProvider';
import { ServiceProvider } from '../../types/enums/ServiceProvider';
import { Logger } from '../logging/Logger';
import { t } from '../../i18n';

/**
 * Handles migration of data from legacy Configuration storage to SecretStorage
 */
export class StorageMigrationService {
    private static readonly MIGRATION_FLAG_KEY = 'otak-committer.migrationCompleted';
    private readonly logger: Logger;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly configStorage: ConfigStorageProvider,
        private readonly setApiKey: (service: ServiceProvider, value: string) => Promise<void>,
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
                StorageMigrationService.MIGRATION_FLAG_KEY,
            );

            if (migrationCompleted) {
                this.logger.debug('[StorageManager] Migration already completed, skipping');
                return;
            }

            this.logger.info('[StorageManager] Starting legacy data migration...');

            const openaiMigrated = await this.migrateLegacyKey(
                ServiceProvider.OpenAI,
                'otakCommitter.openaiApiKey',
            );
            const githubMigrated = await this.migrateLegacyKey(
                ServiceProvider.GitHub,
                'otakCommitter.githubToken',
            );

            if (!openaiMigrated || !githubMigrated) {
                this.logger.warning('[StorageManager] Legacy data migration incomplete');
                return;
            }

            await this.context.globalState.update(StorageMigrationService.MIGRATION_FLAG_KEY, true);
            this.logger.info('[StorageManager] Legacy data migration completed');

            vscode.window.showInformationMessage(t('messages.storageMigrationComplete'));
        } catch (error) {
            this.logger.error('[StorageManager] Migration failed', error);
        }
    }

    /**
     * Migrates a single legacy key from Configuration to SecretStorage.
     */
    async migrateLegacyKey(service: ServiceProvider, legacyConfigKey: string): Promise<boolean> {
        try {
            const legacyValue = await this.configStorage.get(legacyConfigKey);

            if (!legacyValue || legacyValue.trim() === '') {
                return true;
            }

            this.logger.info(`[StorageManager] Migrating ${service} API key from legacy storage`);

            try {
                await this.setApiKey(service, legacyValue);
                await this.configStorage.delete(legacyConfigKey);
                this.logger.info(`[StorageManager] Successfully migrated ${service} API key`);
                return true;
            } catch (migrationError) {
                this.logger.error(
                    `[StorageManager] Failed to migrate ${service} key`,
                    migrationError,
                );
                this.logger.info(
                    `[StorageManager] Keeping ${service} API key in legacy storage until secure storage is available`,
                );
                vscode.window.showWarningMessage(
                    t('messages.storageMigrationFallbackWarning', { service }),
                );
                return false;
            }
        } catch (error) {
            this.logger.error(`[StorageManager] Failed to check/migrate ${service} key`, error);
            return false;
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
        return (
            this.context.globalState.get<boolean>(StorageMigrationService.MIGRATION_FLAG_KEY) ??
            false
        );
    }
}
