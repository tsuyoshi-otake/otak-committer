import * as vscode from 'vscode';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import { BaseService, BaseServiceFactory } from './base';
import { PromptService } from './prompt';
import { ServiceConfig, TemplateInfo } from '../types';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { formatMarkdown, cleanMarkdown } from '../utils';
import { StorageManager } from '../infrastructure/storage';
import { Logger } from '../infrastructure/logging';
import { ErrorHandler } from '../infrastructure/error';
import { t } from '../i18n';
import { getPrompt } from '../languages/prompts';
import type { SupportedLanguage } from '../languages';
import { PromptType } from '../types/enums/PromptType';

/**
 * Service for interacting with OpenAI's API
 *
 * Provides methods for generating commit messages, pull request content,
 * and general chat completions using OpenAI's GPT models.
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
    private static readonly MODEL = 'gpt-5.2';

    constructor(config?: Partial<ServiceConfig>) {
        super(config);
        this.validateState(!!this.config.openaiApiKey, 'OpenAI API key is required');
        this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
        this.promptService = new PromptService();
    }

    private isAuthenticationError(error: unknown): boolean {
        const status = (error as { status?: unknown } | null | undefined)?.status;
        if (status === 401) {
            return true;
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        const lower = errorMessage.toLowerCase();

        return (
            lower.includes('unauthorized') ||
            lower.includes('authentication') ||
            lower.includes('api key') ||
            lower.includes('401')
        );
    }

    private async promptToUpdateApiKey(): Promise<void> {
        const apiKey = this.config.openaiApiKey?.trim();
        if (apiKey) {
            // Key might have been revoked mid-session; re-validate next time.
            OpenAIServiceFactory.invalidateValidatedKey(apiKey);
        }

        const setApiKeyLabel = t('apiKey.setApiKey');
        const action = await vscode.window.showErrorMessage(
            t('apiKey.errorPrompt'),
            setApiKeyLabel,
            t('apiKey.cancel')
        );

        if (action === setApiKeyLabel) {
            await vscode.commands.executeCommand('otak-committer.setApiKey');
        }
    }

    private getReasoningEffort(): 'low' | 'medium' | 'high' | undefined {
        const effort = (this.config.reasoningEffort || 'low').toLowerCase();
        if (effort === 'none') {
            return undefined;
        }
        if (effort === 'low' || effort === 'medium' || effort === 'high') {
            return effort as 'low' | 'medium' | 'high';
        }
        return 'low';
    }

    private getTemperature(requested?: number): number | undefined {
        // GPT-5.x chat completions currently only support default temperature.
        if (OpenAIService.MODEL.startsWith('gpt-5')) {
            return undefined;
        }
        return requested ?? 0.1;
    }

    /**
     * Generate a commit message based on Git diff
     *
     * Uses OpenAI's GPT model to analyze the diff and generate an appropriate
     * commit message in the specified language and style.
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

            const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);

            const temperature = this.getTemperature();
            const response = await this.openai.chat.completions.create({
                model: OpenAIService.MODEL,
                messages: [
                    { role: 'developer', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                ...(temperature !== undefined ? { temperature } : {}),
                reasoning_effort: this.getReasoningEffort(),
                max_completion_tokens: 5000,
                response_format: { type: 'text' },
                store: false
            });

            let message = response.choices[0].message.content;
            if (message) {
                message = message.trimStart();
                this.logger.info('Commit message generated successfully');
                return message;
            }
            this.logger.warning('No commit message content returned from API');
            return undefined;
        } catch (error) {
            this.logger.error('Failed to generate commit message', error);
            if (this.isAuthenticationError(error)) {
                await this.promptToUpdateApiKey();
                return undefined;
            }
            this.showError('Failed to generate commit message', error);
            return undefined;
        }
    }

    /**
     * Generate pull request title and body content
     *
     * Analyzes the diff between branches and generates appropriate PR content
     * including title and detailed description.
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
            const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);

            const temperature = this.getTemperature();
            const [titleResponse, bodyResponse] = await Promise.all([
                this.openai.chat.completions.create({
                    model: OpenAIService.MODEL,
                    messages: [
                        { role: 'developer', content: systemPrompt },
                        { role: 'user', content: prompts.title }
                    ],
                    ...(temperature !== undefined ? { temperature } : {}),
                    reasoning_effort: this.getReasoningEffort(),
                    max_completion_tokens: 100,
                    response_format: { type: 'text' },
                    store: false
                }),
                this.openai.chat.completions.create({
                    model: OpenAIService.MODEL,
                    messages: [
                        { role: 'developer', content: systemPrompt },
                        { role: 'user', content: prompts.body }
                    ],
                    ...(temperature !== undefined ? { temperature } : {}),
                    reasoning_effort: this.getReasoningEffort(),
                    max_completion_tokens: 2000,
                    response_format: { type: 'text' },
                    store: false
                })
            ]);

            const title = titleResponse.choices[0].message.content?.trim();
            const body = bodyResponse.choices[0].message.content?.trim();

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
            if (this.isAuthenticationError(error)) {
                await this.promptToUpdateApiKey();
                return undefined;
            }
            this.showError('Failed to generate PR content', error);
            return undefined;
        }
    }

    /**
     * Create a general chat completion
     *
     * Provides a generic interface for creating chat completions with OpenAI.
     * Useful for custom prompts and specialized use cases.
     *
     * @param params - Chat completion parameters
     * @param params.prompt - The prompt to send to the model
     * @param params.maxTokens - Maximum tokens in the response (default: 1000)
     * @param params.temperature - Sampling temperature (default: 0.1)
     * @param params.model - The model to use (ignored, always uses gpt-5.2)
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
        model?: string;
    }): Promise<string | undefined> {
        try {
            const language = this.config.language || 'english';
            this.logger.info('Creating chat completion', { model: OpenAIService.MODEL, language });

            const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);

            const temperature = this.getTemperature(params.temperature);
            const response = await this.openai.chat.completions.create({
                model: OpenAIService.MODEL,
                messages: [
                    { role: 'developer', content: systemPrompt },
                    { role: 'user', content: params.prompt }
                ],
                ...(temperature !== undefined ? { temperature } : {}),
                reasoning_effort: this.getReasoningEffort(),
                max_completion_tokens: params.maxTokens ?? 1000,
                response_format: { type: 'text' },
                store: false
            });

            this.logger.info('Chat completion created successfully');
            return response.choices[0].message.content?.trim();
        } catch (error) {
            this.logger.error('Failed to create chat completion', error);
            if (this.isAuthenticationError(error)) {
                await this.promptToUpdateApiKey();
                return undefined;
            }
            this.showError('Failed to create chat completion', error);
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
    private static readonly validatedKeyHashes = new Set<string>();

    private static hashKey(apiKey: string): string {
        return crypto.createHash('sha256').update(apiKey).digest('hex');
    }

    static invalidateValidatedKey(apiKey: string): void {
        const trimmed = apiKey.trim();
        if (!trimmed) {
            return;
        }
        OpenAIServiceFactory.validatedKeyHashes.delete(OpenAIServiceFactory.hashKey(trimmed));
    }

    async create(config?: Partial<ServiceConfig>): Promise<OpenAIService> {
        return new OpenAIService(config);
    }

    static async initialize(config?: Partial<ServiceConfig>, context?: vscode.ExtensionContext): Promise<OpenAIService | undefined> {
        const logger = Logger.getInstance();

        try {
            logger.info('Initializing OpenAI service');

            const providedKey = config?.openaiApiKey;
            let apiKey = providedKey?.trim();
            let storage: StorageManager | undefined;

            // If the caller explicitly provided an empty key, fail fast without prompting.
            if (providedKey !== undefined && !apiKey) {
                logger.warning('OpenAI API key is empty');
                return undefined;
            }

            // Try storage only if an API key wasn't provided explicitly
            if (!apiKey) {
                if (!context) {
                    throw new Error('Extension context is required when OpenAI API key is not provided');
                }

                storage = new StorageManager(context);

                // Try to get API key from storage (handles migration automatically)
                apiKey = (await storage.getApiKey('openai'))?.trim();
            }

            // If still no API key, offer to configure via the dedicated command
            if (!apiKey) {
                const setApiKeyLabel = t('apiKey.setApiKey');
                const action = await vscode.window.showWarningMessage(
                    t('messages.apiKeyNotConfigured'),
                    setApiKeyLabel,
                    t('apiKey.cancel')
                );

                if (action === setApiKeyLabel) {
                    await vscode.commands.executeCommand('otak-committer.setApiKey');

                    // Re-read from storage after configuration
                    if (!storage) {
                        if (!context) {
                            return undefined;
                        }
                        storage = new StorageManager(context);
                    }
                    apiKey = (await storage.getApiKey('openai'))?.trim();
                }

                if (!apiKey) {
                    logger.warning('OpenAI API key is not configured');
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
            const keyHash = OpenAIServiceFactory.hashKey(apiKey);
            if (!OpenAIServiceFactory.validatedKeyHashes.has(keyHash)) {
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
                OpenAIServiceFactory.validatedKeyHashes.add(keyHash);
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
