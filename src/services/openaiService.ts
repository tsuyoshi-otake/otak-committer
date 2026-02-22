import * as vscode from 'vscode';
import OpenAI from 'openai';
import { BaseService } from './base';
import { PromptService } from './prompt';
import { ServiceConfig, TemplateInfo } from '../types';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { invalidateValidatedApiKey } from './openaiKeyValidationCache';
import { initializeOpenAIService, showApiKeyErrorDialog } from './openaiInitialize';
import {
    createChatCompletionOp,
    generateCommitMessageOp,
    generatePRContentOp,
    summarizeChunkOp,
} from './openai.ops';
import { resolveTemperature } from './openai.completion';

export class OpenAIService extends BaseService {
    protected openai: OpenAI;
    private promptService: PromptService;
    private static readonly MODEL = 'gpt-5.2';

    constructor(config?: Partial<ServiceConfig>) {
        super(config);
        this.validateState(!!this.config.openaiApiKey, 'OpenAI API key is required');
        this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
        this.promptService = new PromptService();
    }

    private isAuthenticationError(error: unknown): boolean {
        if (
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            error.status === 401
        ) {
            return true;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        const lower = errorMessage.toLowerCase();
        return (
            lower.includes('unauthorized') ||
            lower.includes('authentication') ||
            lower.includes('api key')
        );
    }

    private async promptToUpdateApiKey(): Promise<void> {
        const apiKey = this.config.openaiApiKey?.trim();
        if (apiKey) {
            invalidateValidatedApiKey(apiKey);
        }
        await showApiKeyErrorDialog();
    }

    private getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
        const effort = this.config.reasoningEffort || 'low';
        return effort === 'none' ? undefined : effort;
    }

    private getTemperature(requested?: number): number | undefined {
        return resolveTemperature(OpenAIService.MODEL, requested);
    }

    async generateCommitMessage(
        diff: string,
        language: string,
        messageStyle: MessageStyle | string,
        template?: TemplateInfo,
    ): Promise<string | undefined> {
        return generateCommitMessageOp(this.getOpsContext(), diff, language, messageStyle, template);
    }

    async summarizeChunk(chunkContent: string, language: string): Promise<string | undefined> {
        return summarizeChunkOp(this.getOpsContext(), chunkContent, language);
    }

    async generatePRContent(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo,
    ): Promise<{ title: string; body: string } | undefined> {
        return generatePRContentOp(this.getOpsContext(), diff, language, template);
    }

    async createChatCompletion(params: {
        prompt: string;
        maxTokens?: number;
        temperature?: number;
        model?: string;
    }): Promise<string | undefined> {
        const language = this.config.language || 'english';
        return createChatCompletionOp(this.getOpsContext(), params, language);
    }

    async validateApiKey(): Promise<boolean> {
        try {
            this.logger.debug('Validating OpenAI API key');
            await this.openai.models.list();
            this.logger.info('OpenAI API key validated successfully');
            return true;
        } catch (error) {
            this.logger.warning('OpenAI API key validation failed', error);
            return false;
        }
    }

    static async initialize(
        config?: Partial<ServiceConfig>,
        context?: vscode.ExtensionContext,
    ): Promise<OpenAIService | undefined> {
        return initializeOpenAIService(config, context, async (cfg) => new OpenAIService(cfg));
    }

    private getOpsContext() {
        return {
            openai: this.openai,
            promptService: this.promptService,
            logger: this.logger,
            model: OpenAIService.MODEL,
            getTemperature: (requested?: number) => this.getTemperature(requested),
            getReasoningEffort: () => this.getReasoningEffort(),
            onAuthError: () => this.promptToUpdateApiKey(),
            showError: (message: string, error?: unknown) => this.showError(message, error),
            isAuthenticationError: (error: unknown) => this.isAuthenticationError(error),
        };
    }
}
