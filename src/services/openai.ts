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
import { t } from '../i18n';
import { getPrompt, SupportedLanguage } from '../languages';
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
    private static readonly MODEL = 'gpt-4.1';

    constructor(config?: Partial<ServiceConfig>) {
        super(config);
        this.validateState(!!this.config.openaiApiKey, 'OpenAI API key is required');
        this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
        this.promptService = new PromptService();
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

            const response = await this.openai.chat.completions.create({
                model: OpenAIService.MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 500
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

            const [titleResponse, bodyResponse] = await Promise.all([
                this.openai.chat.completions.create({
                    model: OpenAIService.MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompts.title }
                    ],
                    temperature: 0.1,
                    max_tokens: 100
                }),
                this.openai.chat.completions.create({
                    model: OpenAIService.MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompts.body }
                    ],
                    temperature: 0.1,
                    max_tokens: 2000
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
     * @param params.model - The model to use (ignored, always uses gpt-5.1)
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

            const response = await this.openai.chat.completions.create({
                model: OpenAIService.MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: params.prompt }
                ],
                temperature: params.temperature ?? 0.1,
                max_tokens: params.maxTokens ?? 1000
            });

            this.logger.info('Chat completion created successfully');
            return response.choices[0].message.content?.trim();
        } catch (error) {
            this.logger.error('Failed to create chat completion', error);
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
