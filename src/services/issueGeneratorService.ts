import * as vscode from 'vscode';
import { BaseService } from './base';
import { ServiceConfig } from '../types';
import { IssueType, IssueGenerationParams, GeneratedIssueContent } from '../types/issue';
import { OpenAIService } from './openai';
import { GitService } from './git';
import { GitHubService } from './github';
import { TokenManager } from './tokenManager';
import { analyzeFiles, formatAnalysisResult } from './issueGenerator.analysis';
import {
    buildIssueBodyPrompt,
    generateTitle,
    getAvailableIssueTypes,
} from './issueGenerator.prompts';

export class IssueGeneratorService extends BaseService {
    constructor(
        private readonly openai: OpenAIService,
        private readonly github: GitHubService,
        private readonly git: GitService,
        config?: Partial<ServiceConfig>,
    ) {
        super(config);
    }

    async getTrackedFiles(): Promise<string[]> {
        return this.git.getTrackedFiles();
    }

    getAvailableTypes(): IssueType[] {
        return getAvailableIssueTypes(this.config.useEmoji || false);
    }

    private getMaxTokensLimit(): number {
        return TokenManager.getConfiguredMaxTokens();
    }

    async generatePreview(params: IssueGenerationParams): Promise<GeneratedIssueContent> {
        try {
            this.logger.info('Generating issue preview');

            const fileAnalyses =
                params.files && params.files.length > 0
                    ? await analyzeFiles(params.files, this.getMaxTokensLimit(), this.logger)
                    : [];

            if (fileAnalyses.length > 0) {
                const combinedContent = fileAnalyses.map((a) => a.content || '').join('');
                const estimatedTokens = TokenManager.estimateTokens(combinedContent);
                const maxTokensLimit = this.getMaxTokensLimit();
                if (estimatedTokens > maxTokensLimit) {
                    this.logger.warning(
                        `Analysis content exceeds ${Math.floor(maxTokensLimit / 1000)}K tokens limit (estimated ${Math.floor(estimatedTokens / 1000)}K tokens). Some content will be truncated.`,
                    );
                }
            }

            const analysisResult = formatAnalysisResult(fileAnalyses);
            const useEmoji = this.config.useEmoji || false;
            const customMessage =
                vscode.workspace.getConfiguration('otakCommitter').get<string>('customMessage') ||
                '';

            const [body, title] = await Promise.all([
                this.openai.createChatCompletion({
                    prompt: buildIssueBodyPrompt(
                        analysisResult,
                        params.description,
                        useEmoji,
                        customMessage,
                    ),
                    maxTokens: 1000,
                    temperature: 0.1,
                }),
                generateTitle(
                    this.openai,
                    params.type.type,
                    params.description,
                    this.config.language || 'english',
                    this.logger,
                ),
            ]);

            if (!body) {
                this.logger.error('Failed to generate issue body content');
                throw new Error('Failed to generate content');
            }

            this.logger.info('Issue preview generated successfully');
            return { title, body };
        } catch (error) {
            this.logger.error('Failed to generate preview', error);
            throw new Error(`Failed to generate preview: ${error}`);
        }
    }

    async createIssue(content: GeneratedIssueContent, type: IssueType): Promise<string | undefined> {
        try {
            this.logger.info(`Creating issue: ${content.title}`);
            const useEmoji = this.config.useEmoji || false;

            const issueTitle = useEmoji
                ? `${type.label.split(' ')[0]} ${content.title}`
                : `[${type.type}] ${content.title}`;

            const issue = await this.github.createIssue({
                title: issueTitle,
                body: content.body,
            });

            this.logger.info(`Issue created successfully: ${issue.html_url}`);
            return issue.html_url;
        } catch (error) {
            this.logger.error('Failed to create issue', error);
            this.showError('Failed to create issue', error);
            return undefined;
        }
    }
}
