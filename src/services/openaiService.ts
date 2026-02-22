import * as vscode from 'vscode';
import OpenAI from 'openai';
import { BaseService } from './base';
import { PromptService } from './prompt';
import { ServiceConfig, TemplateInfo } from '../types';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { formatMarkdown, cleanMarkdown } from '../utils';
import { getPrompt } from '../languages/prompts';
import type { SupportedLanguage } from '../languages';
import { PromptType } from '../types/enums/PromptType';
import { invalidateValidatedApiKey } from './openaiKeyValidationCache';
import { initializeOpenAIService, showApiKeyErrorDialog } from './openaiInitialize';

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
        if (effort === 'none') {
            return undefined;
        }
        return effort;
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
        template?: TemplateInfo,
    ): Promise<string | undefined> {
        try {
            this.logger.info('Generating commit message', { language, messageStyle });

            const userPrompt = await this.promptService.createCommitPrompt(
                diff,
                language,
                messageStyle,
                template,
            );

            const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);

            const temperature = this.getTemperature();
            const response = await this.openai.chat.completions.create({
                model: OpenAIService.MODEL,
                messages: [
                    { role: 'developer', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                ...(temperature !== undefined ? { temperature } : {}),
                reasoning_effort: this.getReasoningEffort(),
                max_completion_tokens: 5000,
                response_format: { type: 'text' },
                store: false,
            });

            if (!response.choices || response.choices.length === 0) {
                this.logger.warning('No choices returned from API');
                return undefined;
            }

            let message = response.choices[0].message.content;
            if (typeof message !== 'string' || !message.trim()) {
                this.logger.warning('No commit message content returned from API');
                return undefined;
            }
            message = message.trimStart();
            this.logger.info('Commit message generated successfully');
            return message;
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
     * Summarize a chunk of diff content for map-reduce processing
     *
     * Used by Tier 3 large-diff processing to summarize chunks that exceed
     * the token budget after smart prioritization.
     *
     * @param chunkContent - The diff chunk to summarize
     * @param language - The target language for the summary
     * @returns The summarized content or undefined if summarization fails
     */
    async summarizeChunk(
        chunkContent: string,
        language: string,
    ): Promise<string | undefined> {
        try {
            this.logger.info('Summarizing diff chunk for map-reduce');

            const prompt = this.promptService.createSummarizationPrompt(chunkContent, language);
            const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);

            const temperature = this.getTemperature();
            const response = await this.openai.chat.completions.create({
                model: OpenAIService.MODEL,
                messages: [
                    { role: 'developer', content: systemPrompt },
                    { role: 'user', content: prompt },
                ],
                ...(temperature !== undefined ? { temperature } : {}),
                reasoning_effort: 'low',
                max_completion_tokens: 2000,
                response_format: { type: 'text' },
                store: false,
            });

            const summary = response.choices?.[0]?.message?.content?.trim();
            if (!summary) {
                this.logger.warning('Empty summary returned from chunk summarization');
                return undefined;
            }

            this.logger.info('Chunk summarization completed');
            return summary;
        } catch (error) {
            this.logger.error('Failed to summarize diff chunk', error);
            if (this.isAuthenticationError(error)) {
                await this.promptToUpdateApiKey();
            }
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
        template?: TemplateInfo,
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
                        { role: 'user', content: prompts.title },
                    ],
                    ...(temperature !== undefined ? { temperature } : {}),
                    reasoning_effort: this.getReasoningEffort(),
                    max_completion_tokens: 100,
                    response_format: { type: 'text' },
                    store: false,
                }),
                this.openai.chat.completions.create({
                    model: OpenAIService.MODEL,
                    messages: [
                        { role: 'developer', content: systemPrompt },
                        { role: 'user', content: prompts.body },
                    ],
                    ...(temperature !== undefined ? { temperature } : {}),
                    reasoning_effort: this.getReasoningEffort(),
                    max_completion_tokens: 2000,
                    response_format: { type: 'text' },
                    store: false,
                }),
            ]);

            const title = titleResponse.choices?.[0]?.message?.content?.trim();
            const body = bodyResponse.choices?.[0]?.message?.content?.trim();

            if (typeof title !== 'string' || !title || typeof body !== 'string' || !body) {
                throw new Error('Failed to generate PR content');
            }

            this.logger.info('PR content generated successfully');
            return {
                title: cleanMarkdown(title),
                body: formatMarkdown(body),
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
                    { role: 'user', content: params.prompt },
                ],
                ...(temperature !== undefined ? { temperature } : {}),
                reasoning_effort: this.getReasoningEffort(),
                max_completion_tokens: params.maxTokens ?? 1000,
                response_format: { type: 'text' },
                store: false,
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
    static async initialize(
        config?: Partial<ServiceConfig>,
        context?: vscode.ExtensionContext,
    ): Promise<OpenAIService | undefined> {
        return initializeOpenAIService(config, context, async (cfg) => new OpenAIService(cfg));
    }
}
