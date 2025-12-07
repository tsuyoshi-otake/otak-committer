import * as vscode from 'vscode';
import OpenAI from 'openai';
import { BaseService, BaseServiceFactory } from './base';
import { PromptService } from './prompt';
import { ServiceConfig, TemplateInfo } from '../types';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { formatMarkdown, cleanMarkdown } from '../utils';
import { StorageManager } from '../infrastructure/storage';
import { Logger } from '../infrastructure/logging';
import { ErrorHandler } from '../infrastructure/error';
import { TokenManager } from './tokenManager';
import { t } from '../i18n';

/**
 * Reasoning effort levels for GPT-5.1
 */
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

/**
 * GPT-5.1 Chat Completions request format
 */
interface GPT51Request {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_completion_tokens?: number;
    temperature?: number;
    reasoning_effort?: ReasoningEffort;
    response_format?: { type: string };
    store?: boolean;
}

/**
 * Responses API Error Types
 */
export enum ResponsesAPIErrorType {
    RATE_LIMIT = 'rate_limit',
    INVALID_MODEL = 'invalid_model',
    CONTEXT_LENGTH_EXCEEDED = 'context_length_exceeded',
    NETWORK = 'network',
    AUTHENTICATION = 'authentication',
    UNKNOWN = 'unknown'
}

/**
 * Service for interacting with OpenAI's Responses API (GPT-5.1)
 *
 * Provides methods for generating commit messages, pull request content,
 * and general completions using OpenAI's GPT-5.1 model via the Responses API.
 *
 * @example
 * ```typescript
 * const service = await OpenAIService.initialize({ openaiApiKey: 'sk-...' });
 * const message = await service.generateCommitMessage(diff, 'english', 'normal');
 * ```
 */
export class OpenAIService extends BaseService {
    protected openai: OpenAI;
    private promptService: PromptService;

    /** Default model for all API calls */
    private static readonly MODEL = 'gpt-5.1';

    /** Default reasoning effort */
    private static readonly DEFAULT_REASONING_EFFORT: ReasoningEffort = 'low';

    constructor(config?: Partial<ServiceConfig>) {
        super(config);
        this.validateState(!!this.config.openaiApiKey, 'OpenAI API key is required');
        this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
        this.promptService = new PromptService();
    }

    /**
     * Get reasoning effort from configuration
     */
    private getReasoningEffort(): ReasoningEffort {
        const configuredEffort = vscode.workspace
            .getConfiguration('otakCommitter')
            .get<string>('reasoningEffort');

        if (configuredEffort &&
            ['none', 'low', 'medium', 'high'].includes(configuredEffort)) {
            return configuredEffort as ReasoningEffort;
        }

        return OpenAIService.DEFAULT_REASONING_EFFORT;
    }

    /**
     * Make a request to the GPT-5.1 Chat Completions API
     *
     * @param input - The input prompt
     * @param maxOutputTokens - Maximum output tokens
     * @param temperature - Sampling temperature
     * @returns The generated output text
     */
    private async generateWithGPT51(params: {
        input: string;
        maxOutputTokens: number;
        temperature?: number;
    }): Promise<string | undefined> {
        const reasoningEffort = this.getReasoningEffort();

        // Check and truncate input if needed
        const inputTokens = TokenManager.estimateTokens(params.input);
        let processedInput = params.input;

        if (inputTokens > TokenManager.MAX_INPUT_TOKENS) {
            const estimatedKTokens = Math.floor(inputTokens / 1000);
            const thresholdKTokens = Math.floor(TokenManager.MAX_INPUT_TOKENS / 1000);

            this.logger.warning(
                `Input size (${estimatedKTokens}K tokens) exceeds ${thresholdKTokens}K limit, truncating`
            );

            vscode.window.showWarningMessage(
                `Input size (${estimatedKTokens}K tokens) exceeds the ${thresholdKTokens}K limit. The content will be truncated for AI processing.`
            );

            processedInput = TokenManager.truncateInput(params.input, TokenManager.MAX_INPUT_TOKENS);
        }

        // Validate token allocation
        const finalInputTokens = TokenManager.estimateTokens(processedInput);
        if (!TokenManager.validateAllocation(finalInputTokens, params.maxOutputTokens)) {
            this.logger.warning('Token allocation exceeds context limit, reducing output tokens');
            params.maxOutputTokens = TokenManager.getMaxInputTokens(finalInputTokens);
        }

        const request: GPT51Request = {
            model: OpenAIService.MODEL,
            messages: [
                { role: 'user', content: processedInput }
            ],
            max_completion_tokens: params.maxOutputTokens,
            temperature: params.temperature ?? 0.1,
            reasoning_effort: reasoningEffort,
            response_format: { type: 'text' },
            store: false
        };

        this.logger.debug('Making GPT-5.1 Chat Completions API call', {
            model: request.model,
            inputTokens: finalInputTokens,
            maxOutputTokens: request.max_completion_tokens,
            reasoningEffort
        });

        try {
            // Use the standard chat completions API with GPT-5.1 specific parameters
            const response = await this.openai.chat.completions.create(request as any);

            this.logger.debug('GPT-5.1 API response', {
                finishReason: response.choices?.[0]?.finish_reason,
                usage: response.usage
            });

            // Check for truncation
            if (response.choices?.[0]?.finish_reason === 'length') {
                this.logger.warning('Response was truncated due to max_completion_tokens limit');
                vscode.window.showWarningMessage('The generated message was truncated. Consider increasing max output tokens.');
            }

            // Extract text from response
            const content = response.choices?.[0]?.message?.content;
            if (content) {
                this.logger.debug('Extracted text length', { length: content.length });
                return content;
            }

            this.logger.warning('No content in GPT-5.1 API response');
            return undefined;

        } catch (error) {
            this.handleGPT51Error(error);
            return undefined;
        }
    }

    /**
     * Handle GPT-5.1 API errors with proper classification and user messages
     */
    private handleGPT51Error(error: any): void {
        const errorType = this.classifyError(error);
        const userMessage = this.getUserFriendlyMessage(errorType, error);

        // Log full error context
        this.logger.error('Responses API error', {
            type: errorType,
            status: error?.status,
            message: error?.message,
            stack: error?.stack
        });

        // Show user-friendly message
        vscode.window.showErrorMessage(userMessage);
    }

    /**
     * Classify error type from API error
     */
    private classifyError(error: any): ResponsesAPIErrorType {
        const status = error?.status || error?.statusCode;
        const message = error?.message?.toLowerCase() || '';

        switch (status) {
            case 401:
                return ResponsesAPIErrorType.AUTHENTICATION;
            case 429:
                return ResponsesAPIErrorType.RATE_LIMIT;
            case 404:
                if (message.includes('model')) {
                    return ResponsesAPIErrorType.INVALID_MODEL;
                }
                return ResponsesAPIErrorType.UNKNOWN;
            case 400:
                if (message.includes('context') || message.includes('token')) {
                    return ResponsesAPIErrorType.CONTEXT_LENGTH_EXCEEDED;
                }
                return ResponsesAPIErrorType.UNKNOWN;
            default:
                if (message.includes('network') || message.includes('connection') ||
                    message.includes('econnrefused') || message.includes('timeout')) {
                    return ResponsesAPIErrorType.NETWORK;
                }
                return ResponsesAPIErrorType.UNKNOWN;
        }
    }

    /**
     * Generate user-friendly error message
     */
    private getUserFriendlyMessage(errorType: ResponsesAPIErrorType, error?: any): string {
        switch (errorType) {
            case ResponsesAPIErrorType.RATE_LIMIT:
                const retryAfter = error?.headers?.['retry-after'];
                return retryAfter
                    ? `OpenAI API rate limit reached. Please try again in ${retryAfter} seconds.`
                    : 'OpenAI API rate limit reached. Please try again later.';
            case ResponsesAPIErrorType.INVALID_MODEL:
                return 'GPT-5.1 model not accessible. Please check your API key has access to GPT-5.1.';
            case ResponsesAPIErrorType.CONTEXT_LENGTH_EXCEEDED:
                return 'Input too large for processing. Content has been truncated.';
            case ResponsesAPIErrorType.NETWORK:
                return 'Network error occurred. Please check your connection and try again.';
            case ResponsesAPIErrorType.AUTHENTICATION:
                return 'Invalid OpenAI API key. Please update your API key in settings.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }

    /**
     * Generate a commit message based on Git diff
     *
     * Uses OpenAI's GPT-5.1 model via Responses API to analyze the diff and
     * generate an appropriate commit message in the specified language and style.
     *
     * @param diff - The Git diff to analyze
     * @param language - The language for the commit message
     * @param messageStyle - The style of the message (simple, normal, detailed)
     * @param template - Optional commit message template
     * @returns The generated commit message or undefined if generation fails
     *
     * @example
     * ```typescript
     * const message = await service.generateCommitMessage(
     *   diff,
     *   'english',
     *   MessageStyle.Normal
     * );
     * ```
     */
    async generateCommitMessage(
        diff: string,
        language: string,
        messageStyle: MessageStyle | string,
        template?: TemplateInfo
    ): Promise<string | undefined> {
        try {
            this.logger.info('Generating commit message', { language, messageStyle });

            const userPrompt = await this.promptService.createCommitPrompt(
                diff,
                language,
                messageStyle,
                template
            );

            const response = await this.generateWithGPT51({
                input: userPrompt,
                maxOutputTokens: TokenManager.OUTPUT_TOKENS.COMMIT_MESSAGE,
                temperature: 0.1
            });

            if (response) {
                const message = response.trimStart();
                this.logger.info('Commit message generated successfully');
                return message;
            }

            this.logger.warning('No commit message content returned from API');
            return undefined;
        } catch (error) {
            this.logger.error('Failed to generate commit message', error);
            this.showError('Failed to generate commit message', error);
            return undefined;
        }
    }

    /**
     * Generate pull request title and body content
     *
     * Analyzes the diff between branches and generates appropriate PR content
     * including title and detailed description using GPT-5.1 Responses API.
     *
     * @param diff - The pull request diff information
     * @param language - The language for the PR content
     * @param template - Optional PR template
     * @returns Object containing title and body, or undefined if generation fails
     *
     * @example
     * ```typescript
     * const prContent = await service.generatePRContent(diff, 'english');
     * console.log(prContent.title, prContent.body);
     * ```
     */
    async generatePRContent(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo
    ): Promise<{ title: string; body: string } | undefined> {
        try {
            this.logger.info('Generating PR content', { language });

            const prompts = await this.promptService.createPRPrompt(diff, language, template);

            const [titleResponse, bodyResponse] = await Promise.all([
                this.generateWithGPT51({
                    input: prompts.title,
                    maxOutputTokens: TokenManager.OUTPUT_TOKENS.PR_TITLE,
                    temperature: 0.1
                }),
                this.generateWithGPT51({
                    input: prompts.body,
                    maxOutputTokens: TokenManager.OUTPUT_TOKENS.PR_BODY,
                    temperature: 0.1
                })
            ]);

            const title = titleResponse?.trim();
            const body = bodyResponse?.trim();

            if (!title || !body) {
                throw new Error('Failed to generate PR content');
            }

            this.logger.info('PR content generated successfully');
            return {
                title: cleanMarkdown(title),
                body: formatMarkdown(body)
            };
        } catch (error) {
            this.logger.error('Failed to generate PR content', error);
            this.showError('Failed to generate PR content', error);
            return undefined;
        }
    }

    /**
     * Create a general completion using Responses API
     *
     * Provides a generic interface for creating completions with GPT-5.1.
     * Useful for custom prompts and specialized use cases.
     *
     * @param params - Completion parameters
     * @param params.prompt - The prompt to send to the model
     * @param params.maxTokens - Maximum tokens in the response (default: 1000)
     * @param params.temperature - Sampling temperature (default: 0.1)
     * @returns The generated response or undefined if generation fails
     *
     * @example
     * ```typescript
     * const response = await service.createChatCompletion({
     *   prompt: 'Explain this code...',
     *   maxTokens: 500,
     *   temperature: 0.2
     * });
     * ```
     */
    async createChatCompletion(params: {
        prompt: string;
        maxTokens?: number;
        temperature?: number;
        model?: string;  // Ignored in GPT-5.1 migration, always uses gpt-5.1
    }): Promise<string | undefined> {
        try {
            const language = this.config.language || 'english';
            this.logger.info('Creating completion', { model: OpenAIService.MODEL, language });

            // Incorporate system instructions into the prompt (Responses API format)
            const fullPrompt = `Please ensure all responses are in ${language}. Use appropriate style and terminology for ${language}.\n\n${params.prompt}`;

            const response = await this.generateWithGPT51({
                input: fullPrompt,
                maxOutputTokens: params.maxTokens ?? 1000,
                temperature: params.temperature ?? 0.1
            });

            if (response) {
                this.logger.info('Completion created successfully');
                return response.trim();
            }

            return undefined;
        } catch (error) {
            this.logger.error('Failed to create completion', error);
            this.showError('Failed to create completion', error);
            return undefined;
        }
    }

    /**
     * Validate the OpenAI API key
     *
     * Tests the API key by attempting to list available models.
     *
     * @returns True if the API key is valid, false otherwise
     *
     * @example
     * ```typescript
     * const isValid = await service.validateApiKey();
     * if (!isValid) {
     *   console.error('Invalid API key');
     * }
     * ```
     */
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

    /**
     * Initialize an OpenAI service instance
     *
     * Factory method that creates and initializes an OpenAI service with
     * proper configuration and API key validation.
     *
     * @param config - Optional service configuration
     * @param context - VS Code extension context (required for storage access)
     * @returns Initialized OpenAI service or undefined if initialization fails
     *
     * @example
     * ```typescript
     * const service = await OpenAIService.initialize({
     *   openaiApiKey: 'sk-...',
     *   language: 'english'
     * }, context);
     * ```
     */
    static async initialize(config?: Partial<ServiceConfig>, context?: vscode.ExtensionContext): Promise<OpenAIService | undefined> {
        return OpenAIServiceFactory.initialize(config, context);
    }
}

/**
 * Factory for creating OpenAI service instances
 *
 * Handles service initialization and API key retrieval from storage.
 */
export class OpenAIServiceFactory extends BaseServiceFactory<OpenAIService> {
    async create(config?: Partial<ServiceConfig>): Promise<OpenAIService> {
        return new OpenAIService(config);
    }

    static async initialize(config?: Partial<ServiceConfig>, context?: vscode.ExtensionContext): Promise<OpenAIService | undefined> {
        const logger = Logger.getInstance();

        try {
            logger.info('Initializing OpenAI service');

            // Get extension context - required for StorageManager
            if (!context) {
                throw new Error('Extension context is required for OpenAI service initialization');
            }

            const storage = new StorageManager(context);

            // Try to get API key from storage (handles migration automatically)
            let apiKey = await storage.getApiKey('openai');

            // If still no API key, prompt user
            if (!apiKey) {
                const configured = await vscode.window.showWarningMessage(
                    'OpenAI API key is not configured. Would you like to configure it now?',
                    'Yes',
                    'No'
                );

                if (configured === 'Yes') {
                    apiKey = await vscode.window.showInputBox({
                        prompt: 'Enter your OpenAI API Key',
                        placeHolder: 'sk-...',
                        password: true,
                        ignoreFocusOut: true,
                        validateInput: (value) => {
                            if (!value || value.trim() === '') {
                                return 'API Key is required';
                            }
                            if (!value.startsWith('sk-')) {
                                return 'Invalid API Key format (should start with sk-)';
                            }
                            return undefined;
                        }
                    });

                    if (apiKey) {
                        await storage.setApiKey('openai', apiKey);
                        vscode.window.showInformationMessage('OpenAI API Key has been securely saved');
                    } else {
                        logger.warning('User declined to configure OpenAI API key');
                        return undefined;
                    }
                } else {
                    logger.warning('User declined to configure OpenAI API key');
                    return undefined;
                }
            }

            const serviceConfig = {
                ...config,
                openaiApiKey: apiKey
            };

            const factory = new OpenAIServiceFactory();
            const service = await factory.create(serviceConfig);

            // Validate API key
            if (!await service.validateApiKey()) {
                const setApiKeyLabel = t('apiKey.setApiKey');
                const action = await vscode.window.showErrorMessage(
                    t('apiKey.invalidKeyPrompt'),
                    setApiKeyLabel,
                    t('apiKey.cancel')
                );

                if (action === setApiKeyLabel) {
                    await vscode.commands.executeCommand('otak-committer.setApiKey');
                }
                return undefined;
            }

            logger.info('OpenAI service initialized successfully');
            return service;

        } catch (error) {
            // Check if it's an API key related error
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                const setApiKeyLabel = t('apiKey.setApiKey');
                const action = await vscode.window.showErrorMessage(
                    t('apiKey.errorPrompt'),
                    setApiKeyLabel,
                    t('apiKey.cancel')
                );

                if (action === setApiKeyLabel) {
                    await vscode.commands.executeCommand('otak-committer.setApiKey');
                }
                return undefined;
            }

            ErrorHandler.handle(error, {
                operation: 'Initialize OpenAI service',
                component: 'OpenAIServiceFactory'
            });
            return undefined;
        }
    }
}
