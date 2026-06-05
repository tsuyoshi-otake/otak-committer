import * as vscode from 'vscode';
import { BaseServiceFactory } from './base';
import { ServiceConfig } from '../types';
import { t } from '../i18n';
import { ErrorHandler } from '../infrastructure/error';
import { OpenAIServiceFactory } from './openai';
import { GitServiceFactory } from './git';
import { GitHubServiceFactory } from './github';
import { IssueGeneratorService } from './issueGeneratorService';

/**
 * Factory that wires together the dependencies needed to construct an IssueGeneratorService.
 */
export class IssueGeneratorServiceFactory extends BaseServiceFactory<IssueGeneratorService> {
    constructor(private readonly context: vscode.ExtensionContext) {
        super();
    }

    async create(config?: Partial<ServiceConfig>): Promise<IssueGeneratorService> {
        const github = await GitHubServiceFactory.initialize();
        if (!github) {
            vscode.window.showErrorMessage(t('messages.authRequired'));
            throw new Error(t('messages.authRequired'));
        }

        const [openai, git] = await Promise.all([
            OpenAIServiceFactory.initialize(config, this.context),
            GitServiceFactory.initialize(config),
        ]);

        if (!openai || !git) {
            throw new Error(t('errors.failedToInitializeRequiredServices'));
        }

        return new IssueGeneratorService(openai, github, git, config);
    }

    static async initialize(
        config?: Partial<ServiceConfig>,
        context?: vscode.ExtensionContext,
    ): Promise<IssueGeneratorService | undefined> {
        try {
            if (!context) {
                throw new Error(t('errors.extensionContextRequiredForIssueGenerator'));
            }
            const factory = new IssueGeneratorServiceFactory(context);
            return await factory.create(config);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: t('operations.initializingIssueGeneratorService'),
                component: 'IssueGeneratorServiceFactory',
            });
            return undefined;
        }
    }
}
