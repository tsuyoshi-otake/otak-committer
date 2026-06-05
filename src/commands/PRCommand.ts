import { BaseCommand } from './BaseCommand';
import { t } from '../i18n/index.js';
import { runPRGenerationWorkflow } from './pr.workflow';

export class PRCommand extends BaseCommand {
    async execute(): Promise<void> {
        try {
            this.logger.info('Starting PR generation');

            if (
                await runPRGenerationWorkflow({
                    config: this.config,
                    logger: this.logger,
                    storageUri: this.context.globalStorageUri,
                    initializeOpenAI: () => this.initializeOpenAI(),
                    withProgress: (title, task) => this.withProgress(title, task),
                    setPreviewFile: (previewFile) => {
                        this.previewFile = previewFile;
                    },
                    openExternalUrl: (url) => this.openExternalUrl(url),
                })
            ) {
                this.logger.info('Successfully created PR');
            }
        } catch (error) {
            this.handleErrorSilently(error, t('operations.generatingPullRequest'));
        } finally {
            await this.cleanupPreview();
        }
    }
}
