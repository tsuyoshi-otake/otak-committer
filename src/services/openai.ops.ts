import { PromptService } from './prompt';
import OpenAI from 'openai';
import { Logger } from '../infrastructure/logging/Logger';
import { TemplateInfo } from '../types';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { formatMarkdown, cleanMarkdown } from '../utils';
import { getPrompt } from '../languages/prompts';
import type { SupportedLanguage } from '../languages';
import { PromptType } from '../types/enums/PromptType';
import { requestTextCompletion } from './openai.completion';

interface OpenAIOpsContext {
    openai: OpenAI;
    promptService: PromptService;
    logger: Logger;
    model: string;
    getTemperature: (requested?: number) => number | undefined;
    getReasoningEffort: () => 'low' | 'medium' | 'high' | undefined;
    onAuthError: () => Promise<void>;
    showError: (message: string, error?: unknown) => void;
    isAuthenticationError: (error: unknown) => boolean;
}

export async function generateCommitMessageOp(
    context: OpenAIOpsContext,
    diff: string,
    language: string,
    messageStyle: MessageStyle | string,
    template?: TemplateInfo,
): Promise<string | undefined> {
    try {
        context.logger.info('Generating commit message', { language, messageStyle });

        const userPrompt = await context.promptService.createCommitPrompt(
            diff,
            language,
            messageStyle,
            template,
        );
        const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);
        const message = await requestTextCompletion({
            openai: context.openai,
            model: context.model,
            systemPrompt,
            userPrompt,
            temperature: context.getTemperature(),
            reasoningEffort: context.getReasoningEffort(),
            maxCompletionTokens: 5000,
        });

        if (typeof message !== 'string' || !message.trim()) {
            context.logger.warning('No commit message content returned from API');
            return undefined;
        }

        context.logger.info('Commit message generated successfully');
        return message.trimStart();
    } catch (error) {
        context.logger.error('Failed to generate commit message', error);
        if (context.isAuthenticationError(error)) {
            await context.onAuthError();
            return undefined;
        }
        context.showError('Failed to generate commit message', error);
        return undefined;
    }
}

export async function summarizeChunkOp(
    context: OpenAIOpsContext,
    chunkContent: string,
    language: string,
): Promise<string | undefined> {
    try {
        context.logger.info('Summarizing diff chunk for map-reduce');

        const prompt = context.promptService.createSummarizationPrompt(chunkContent, language);
        const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);
        const summary = await requestTextCompletion({
            openai: context.openai,
            model: context.model,
            systemPrompt,
            userPrompt: prompt,
            temperature: context.getTemperature(),
            reasoningEffort: 'low',
            maxCompletionTokens: 2000,
        });

        if (!summary) {
            context.logger.warning('Empty summary returned from chunk summarization');
            return undefined;
        }

        context.logger.info('Chunk summarization completed');
        return summary;
    } catch (error) {
        context.logger.error('Failed to summarize diff chunk', error);
        if (context.isAuthenticationError(error)) {
            await context.onAuthError();
        }
        return undefined;
    }
}

export async function generatePRContentOp(
    context: OpenAIOpsContext,
    diff: PullRequestDiff,
    language: string,
    template?: TemplateInfo,
): Promise<{ title: string; body: string } | undefined> {
    try {
        context.logger.info('Generating PR content', { language });

        const prompts = await context.promptService.createPRPrompt(diff, language, template);
        const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);
        const temperature = context.getTemperature();

        const [title, body] = await Promise.all([
            requestTextCompletion({
                openai: context.openai,
                model: context.model,
                systemPrompt,
                userPrompt: prompts.title,
                temperature,
                reasoningEffort: context.getReasoningEffort(),
                maxCompletionTokens: 100,
            }),
            requestTextCompletion({
                openai: context.openai,
                model: context.model,
                systemPrompt,
                userPrompt: prompts.body,
                temperature,
                reasoningEffort: context.getReasoningEffort(),
                maxCompletionTokens: 2000,
            }),
        ]);

        if (typeof title !== 'string' || !title || typeof body !== 'string' || !body) {
            throw new Error('Failed to generate PR content');
        }

        context.logger.info('PR content generated successfully');
        return {
            title: cleanMarkdown(title),
            body: formatMarkdown(body),
        };
    } catch (error) {
        context.logger.error('Failed to generate PR content', error);
        if (context.isAuthenticationError(error)) {
            await context.onAuthError();
            return undefined;
        }
        context.showError('Failed to generate PR content', error);
        return undefined;
    }
}

export async function createChatCompletionOp(
    context: OpenAIOpsContext,
    params: {
        prompt: string;
        maxTokens?: number;
        temperature?: number;
        model?: string;
    },
    language: string,
): Promise<string | undefined> {
    try {
        context.logger.info('Creating chat completion', { model: context.model, language });

        const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);
        const response = await requestTextCompletion({
            openai: context.openai,
            model: context.model,
            systemPrompt,
            userPrompt: params.prompt,
            temperature: context.getTemperature(params.temperature),
            reasoningEffort: context.getReasoningEffort(),
            maxCompletionTokens: params.maxTokens ?? 1000,
        });

        context.logger.info('Chat completion created successfully');
        return response;
    } catch (error) {
        context.logger.error('Failed to create chat completion', error);
        if (context.isAuthenticationError(error)) {
            await context.onAuthError();
            return undefined;
        }
        context.showError('Failed to create chat completion', error);
        return undefined;
    }
}
