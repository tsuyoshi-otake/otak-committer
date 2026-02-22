import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { IssueGeneratorServiceFactory, IssueGeneratorService } from '../services/issueGenerator';
import { ServiceError } from '../types/errors';
import { IssueType } from '../types/issue';
import { t } from '../i18n/index.js';
import { promptIssueDescription, selectFilesForAnalysis, selectIssueType } from './issue.input';
import { runIssuePreviewLoop } from './issue.previewFlow';

export class IssueCommand extends BaseCommand {
    async execute(): Promise<void> {
        try {
            this.logger.info('Starting issue generation');

            const authenticated = await this.authenticateGitHub();
            if (!authenticated) {
                return;
            }

            const service = await this.initializeService();
            if (!service) {
                return;
            }

            const issueType = await selectIssueType(service, this.logger);
            if (!issueType) {
                return;
            }

            const selectedFiles = await selectFilesForAnalysis(service, this.logger);
            if (selectedFiles === undefined) {
                return;
            }

            const description = await promptIssueDescription(this.logger);
            if (!description) {
                return;
            }

            await this.generateAndCreateIssue(service, issueType, description, selectedFiles);
            this.logger.info('Successfully completed issue generation');
        } catch (error) {
            this.handleErrorSilently(error, 'generating issue');
        } finally {
            await this.cleanupPreview();
        }
    }

    private async authenticateGitHub(): Promise<boolean> {
        this.logger.debug('Checking GitHub authentication');

        try {
            const session = await vscode.authentication.getSession('github', ['repo'], {
                createIfNone: true,
            });

            if (!session) {
                this.logger.warning('GitHub authentication failed');
                vscode.window.showErrorMessage(t('messages.authRequired'));
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error('Error during GitHub authentication', error);
            throw new ServiceError('Failed to authenticate with GitHub', 'github', {
                originalError: error,
            });
        }
    }

    private async initializeService(): Promise<IssueGeneratorService | undefined> {
        this.logger.debug('Initializing IssueGeneratorService');

        try {
            const service = await IssueGeneratorServiceFactory.initialize(undefined, this.context);
            if (!service) {
                this.logger.error('Failed to initialize IssueGeneratorService');
                return undefined;
            }
            return service;
        } catch (error) {
            this.logger.error('Error initializing issue generator service', error);
            throw new ServiceError('Failed to initialize issue generator service', 'issue-generator', {
                originalError: error,
            });
        }
    }

    private async generateAndCreateIssue(
        service: IssueGeneratorService,
        issueType: IssueType,
        description: string,
        selectedFiles: string[],
    ): Promise<void> {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: t('messages.generatingIssue'),
                cancellable: false,
            },
            async (progress) => {
                const preview = await runIssuePreviewLoop({
                    service,
                    issueType,
                    description,
                    selectedFiles,
                    progress,
                    logger: this.logger,
                    onPreviewRendered: (previewFile) => {
                        this.previewFile = previewFile;
                    },
                });
                if (!preview) {
                    return;
                }

                progress.report({ message: t('messages.creatingIssue') });
                const issueUrl = await service.createIssue(preview, issueType);
                if (issueUrl) {
                    await this.handleSuccessfulCreation(issueUrl);
                }
            },
        );
    }

    private async handleSuccessfulCreation(issueUrl: string): Promise<void> {
        this.logger.info(`Issue created successfully: ${issueUrl}`);
        await this.cleanupPreview();

        const response = await vscode.window.showInformationMessage(
            t('messages.issueCreatedSuccess'),
            t('buttons.openIssue'),
        );

        if (response === t('buttons.openIssue')) {
            await this.openExternalUrl(issueUrl);
        }
    }
}
