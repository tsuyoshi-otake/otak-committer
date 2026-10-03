import * as vscode from 'vscode';
import OpenAI from 'openai';
import { BaseService } from './base';
import { PromptService } from './prompt';
import { ServiceConfig, TemplateInfo } from '../types';
import { MessageStyle } from '../types/enums/MessageStyle';
import type { ReasoningEffort } from '../types/enums/ReasoningEffort';
import { PullRequestDiff } from '../types/interfaces/GitHub';
import {
    invalidateValidatedConnection,
    markConnectionValidated,
} from './openaiKeyValidationCache';
import { initializeOpenAIService, showApiKeyErrorDialog } from './openaiInitialize';
import {
    createChatCompletionOp,
    generateCommitMessageOp,
    generatePRContentOp,
    summarizeChunkOp,
} from './openai.ops';
import {
    createOpenAIConnectionContext,
    type OpenAIConnectionContext,
} from './openaiConnection';
import { createOpenAIClient } from './openaiClient';
import { getModelForOperation, type OpenAIOperation } from './openaiModels';
import { validateApiKey as validateOpenAIConnection } from './openaiValidation';

/**
 * High-level service that wraps the OpenAI client for commit message,
 * PR content, summarization, and chat completion operations
 */
export class OpenAIService extends BaseService {
    protected openai: OpenAI;
    private promptService: PromptService;
    private readonly connection: OpenAIConnectionContext;
    private authErrorPrompt?: Promise<void>;

    constructor(config?: Partial<ServiceConfig>) {
        super(config);
        this.validateState(!!this.config.openaiApiKey, 'OpenAI API key is required');
        this.connection = createOpenAIConnectionContext(
            this.config.openaiApiKey,
            this.config.openaiBaseUrl,
            process.env.OPENAI_BASE_URL,
        );
        this.openai = createOpenAIClient(this.connection);
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
        invalidateValidatedConnection(this.connection.apiKey, this.connection.baseURL);
        if (this.authErrorPrompt) {
            return this.authErrorPrompt;
        }

        this.authErrorPrompt = showApiKeyErrorDialog().finally(() => {
            this.authErrorPrompt = undefined;
        });
        return this.authErrorPrompt;
    }

    private getReasoningEffort(): ReasoningEffort {
        return this.config.reasoningEffort || 'low';
    }

    async generateCommitMessage(
        diff: string,
        language: string,
        messageStyle: MessageStyle | string,
        template?: TemplateInfo,
        signal?: AbortSignal,
    ): Promise<string | undefined> {
        return generateCommitMessageOp(
            this.getOpsContext('commit-message', signal),
            diff,
            language,
            messageStyle,
            template,
        );
    }

    async summarizeChunk(
        chunkContent: string,
        language: string,
        signal?: AbortSignal,
    ): Promise<string | undefined> {
        return summarizeChunkOp(
            this.getOpsContext('commit-summary', signal),
            chunkContent,
            language,
        );
    }

    async generatePRContent(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo,
    ): Promise<{ title: string; body: string } | undefined> {
        return generatePRContentOp(this.getOpsContext('pr-content'), diff, language, template);
    }

    async createChatCompletion(params: {
        prompt: string;
        maxTokens?: number;
    }): Promise<string | undefined> {
        const language = this.config.language || 'english';
        return createChatCompletionOp(this.getOpsContext('generic-chat'), params, language);
    }

    async validateApiKey(): Promise<boolean> {
        this.logger.debug('Validating OpenAI API key');
        const result = await validateOpenAIConnection(
            this.connection.apiKey,
            this.connection.baseURL,
        );
        if (result.ok) {
            this.logger.info('OpenAI API key validated successfully');
            return true;
        }
        this.logger.warning('OpenAI API key validation failed', result);
        return false;
    }

    static async initialize(
        config?: Partial<ServiceConfig>,
        context?: vscode.ExtensionContext,
    ): Promise<OpenAIService | undefined> {
        return initializeOpenAIService(config, context, async (cfg) => new OpenAIService(cfg));
    }

    private getOpsContext(operation: OpenAIOperation, signal?: AbortSignal) {
        return {
            openai: this.openai,
            promptService: this.promptService,
            logger: this.logger,
            model: getModelForOperation(operation),
            getReasoningEffort: () => this.getReasoningEffort(),
            onAuthError: () => this.promptToUpdateApiKey(),
            showError: (message: string, error?: unknown) => this.showError(message, error),
            isAuthenticationError: (error: unknown) => this.isAuthenticationError(error),
            onRequestSuccess: () =>
                markConnectionValidated(this.connection.apiKey, this.connection.baseURL),
            signal,
        };
    }
}
