import * as vscode from 'vscode';
import OpenAI from 'openai';
import { BaseService, BaseServiceFactory } from './base';
import { PromptService } from './prompt';
import { ServiceConfig, TemplateInfo } from '../types';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { formatMarkdown, cleanMarkdown } from '../utils';

export class OpenAIService extends BaseService {
    protected openai: OpenAI;
    private promptService: PromptService;

    constructor(config?: Partial<ServiceConfig>) {
        super(config);
        this.validateState(!!this.config.openaiApiKey, 'OpenAI API key is required');
        this.openai = new OpenAI({ apiKey: this.config.openaiApiKey });
        this.promptService = new PromptService();
    }

    async generateCommitMessage(
        diff: string,
        language: string,
        messageStyle: MessageStyle,
        template?: TemplateInfo
    ): Promise<string | undefined> {
        try {
            const userPrompt = await this.promptService.createCommitPrompt(
                diff,
                language,
                messageStyle,
                template
            );

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4.1',
                messages: [
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 100
            });

            let message = response.choices[0].message.content;
            if (message) {
                message = message.trimStart();
                return message;
            }
            return undefined;
        } catch (error) {
            this.showError('Failed to generate commit message', error);
            return undefined;
        }
    }

    async generatePRContent(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo
    ): Promise<{ title: string; body: string } | undefined> {
        try {
            const prompts = await this.promptService.createPRPrompt(diff, language, template);

            const [titleResponse, bodyResponse] = await Promise.all([
                this.openai.chat.completions.create({
                    model: 'chatgpt-4o-latest',
                    messages: [{ role: 'user', content: prompts.title }],
                    temperature: 0.1,
                    max_tokens: 100
                }),
                this.openai.chat.completions.create({
                    model: 'chatgpt-4o-latest',
                    messages: [{ role: 'user', content: prompts.body }],
                    temperature: 0.1,
                    max_tokens: 1000
                })
            ]);

            const title = titleResponse.choices[0].message.content?.trim();
            const body = bodyResponse.choices[0].message.content?.trim();

            if (!title || !body) {
                throw new Error('Failed to generate PR content');
            }

            return {
                title: cleanMarkdown(title),
                body: formatMarkdown(body)
            };
        } catch (error) {
            this.showError('Failed to generate PR content', error);
            return undefined;
        }
    }

    async createChatCompletion(params: {
        prompt: string;
        maxTokens?: number;
        temperature?: number;
        model?: string;
    }): Promise<string | undefined> {
        try {
            const language = this.config.language || 'english';

            const response = await this.openai.chat.completions.create({
                model: params.model || 'chatgpt-4o-latest',
                messages: [
                    {
                        role: 'system',
                        content: `Please ensure all responses are in ${language}. Use appropriate style and terminology for ${language}.`
                    },
                    {
                        role: 'user',
                        content: params.prompt
                    }
                ],
                temperature: params.temperature ?? 0.1,
                max_tokens: params.maxTokens ?? 1000
            });

            return response.choices[0].message.content?.trim();
        } catch (error) {
            this.showError('Failed to create chat completion', error);
            return undefined;
        }
    }

    async validateApiKey(): Promise<boolean> {
        try {
            await this.openai.models.list();
            return true;
        } catch {
            return false;
        }
    }

    static async initialize(config?: Partial<ServiceConfig>): Promise<OpenAIService | undefined> {
        return OpenAIServiceFactory.initialize(config);
    }
}

export class OpenAIServiceFactory extends BaseServiceFactory<OpenAIService> {
    async create(config?: Partial<ServiceConfig>): Promise<OpenAIService> {
        return new OpenAIService(config);
    }

    static async initialize(config?: Partial<ServiceConfig>): Promise<OpenAIService | undefined> {
        try {
            const serviceConfig = {
                ...config,
                openaiApiKey: config?.openaiApiKey || vscode.workspace.getConfiguration('otakCommitter').get<string>('openaiApiKey')
            };

            if (!serviceConfig.openaiApiKey) {
                const configured = await vscode.window.showWarningMessage(
                    'OpenAI API key is not configured. Would you like to configure it now?',
                    'Yes',
                    'No'
                );

                if (configured === 'Yes') {
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'otakCommitter.openai');
                }
                return undefined;
            }

            const factory = new OpenAIServiceFactory();
            const service = await factory.create(serviceConfig);

            // APIキーの有効性を確認
            if (!await service.validateApiKey()) {
                throw new Error('Invalid OpenAI API key');
            }

            return service;

        } catch (error) {
            console.error('Failed to initialize OpenAI service:', error);
            vscode.window.showErrorMessage(
                error instanceof Error 
                    ? error.message 
                    : 'Failed to initialize OpenAI service'
            );
            return undefined;
        }
    }
}