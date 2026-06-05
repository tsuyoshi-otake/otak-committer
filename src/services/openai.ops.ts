import { PromptService } from './prompt';
import OpenAI from 'openai';
import { Logger } from '../infrastructure/logging/Logger';
import { TemplateInfo } from '../types';
import { MessageStyle } from '../types/enums/MessageStyle';
import { PullRequestDiff } from '../types/interfaces/GitHub';
import { formatMarkdown, cleanMarkdown } from '../utils';
import { getPrompt } from '../languages/prompts';
import type { SupportedLanguage } from '../languages';
import { PromptType } from '../types/enums/PromptType';
import { requestTextCompletion, requestStructuredCompletion } from './openai.completion';
import { TokenManager } from './tokenManager';
import { t } from '../i18n/index.js';
import { isUserAbortError } from '../utils/errorGuards';

interface OpenAIOpsContext {
    openai: OpenAI;
    promptService: PromptService;
    logger: Logger;
    model: string;
    getReasoningEffort: () => 'low' | 'medium' | 'high' | undefined;
    onAuthError: () => Promise<void>;
    showError: (message: string, error?: unknown) => void;
    isAuthenticationError: (error: unknown) => boolean;
    signal?: AbortSignal;
}

/**
 * Generate a commit message from a diff using the configured OpenAI model
 *
 * @param context - Shared OpenAI operation context
 * @param diff - The git diff to summarize as a commit message
 * @param language - The natural language identifier for the output
 * @param messageStyle - The commit message style (e.g. simple/normal/detailed)
 * @param template - Optional template to guide the generated message
 * @returns The generated commit message, or undefined on failure
 */
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
            reasoningEffort: context.getReasoningEffort(),
            maxCompletionTokens: TokenManager.OUTPUT_TOKENS.COMMIT_MESSAGE,
            signal: context.signal,
        });

        if (typeof message !== 'string' || !message.trim()) {
            context.logger.warning('No commit message content returned from API');
            return undefined;
        }

        context.logger.info('Commit message generated successfully');
        return message.trimStart();
    } catch (error) {
        // Re-throw abort errors so they can be handled by the caller.
        if (isUserAbortError(error)) {
            throw error;
        }
        context.logger.error('Failed to generate commit message', error);
        if (context.isAuthenticationError(error)) {
            await context.onAuthError();
            return undefined;
        }
        context.showError(t('errors.failedToGenerateCommitMessage'), error);
        return undefined;
    }
}

/**
 * Summarize a single diff chunk as part of the map-reduce flow
 *
 * @param context - Shared OpenAI operation context
 * @param chunkContent - The diff chunk content to summarize
 * @param language - The natural language identifier for the output
 * @returns The summary text, or undefined on failure
 */
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
            reasoningEffort: 'low',
            maxCompletionTokens: TokenManager.SUMMARIZATION_OUTPUT_TOKENS,
            signal: context.signal,
        });

        if (!summary) {
            context.logger.warning('Empty summary returned from chunk summarization');
            return undefined;
        }

        context.logger.info('Chunk summarization completed');
        return summary;
    } catch (error) {
        if (isUserAbortError(error)) {
            throw error;
        }
        context.logger.error('Failed to summarize diff chunk', error);
        if (context.isAuthenticationError(error)) {
            await context.onAuthError();
        }
        return undefined;
    }
}

const PR_CONTENT_SCHEMA = {
    type: 'object',
    properties: {
        title: { type: 'string', description: 'Pull request title with prefix' },
        body: { type: 'string', description: 'Pull request body in markdown' },
    },
    required: ['title', 'body'],
    additionalProperties: false,
} as const;

/**
 * Generate a pull request title and body via the OpenAI structured-output API
 *
 * @param context - Shared OpenAI operation context
 * @param diff - The pull request diff used as input
 * @param language - The natural language identifier for the output
 * @param template - Optional template to guide the generated PR content
 * @returns The generated title and body, or undefined on failure
 */
export async function generatePRContentOp(
    context: OpenAIOpsContext,
    diff: PullRequestDiff,
    language: string,
    template?: TemplateInfo,
): Promise<{ title: string; body: string } | undefined> {
    try {
        context.logger.info('Generating PR content with structured output', { language });

        const userPrompt = await context.promptService.createPRPrompt(diff, language, template);
        const systemPrompt = getPrompt(language as SupportedLanguage, PromptType.System);

        const result = await requestStructuredCompletion<{ title: string; body: string }>({
            openai: context.openai,
            model: context.model,
            systemPrompt,
            userPrompt,
            reasoningEffort: context.getReasoningEffort(),
            schemaName: 'pr_content',
            schema: PR_CONTENT_SCHEMA,
        });

        if (!result || !result.title || !result.body) {
            context.logger.warning('Empty PR content returned from API');
            return undefined;
        }

        context.logger.info('PR content generated successfully');
        return {
            title: cleanMarkdown(result.title),
            body: formatMarkdown(result.body),
        };
    } catch (error) {
        if (isUserAbortError(error)) {
            throw error;
        }
        context.logger.error('Failed to generate PR content', error);
        if (context.isAuthenticationError(error)) {
            await context.onAuthError();
            return undefined;
        }
        context.showError(t('errors.failedToGeneratePRContent'), error);
        return undefined;
    }
}

/**
 * Run a generic chat completion against the configured OpenAI model
 *
 * @param context - Shared OpenAI operation context
 * @param params - Prompt text and optional token limit
 * @param language - The natural language identifier for the system prompt
 * @returns The completion text, or undefined on failure
 */
export async function createChatCompletionOp(
    context: OpenAIOpsContext,
    params: {
        prompt: string;
        maxTokens?: number;
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
            reasoningEffort: context.getReasoningEffort(),
            maxCompletionTokens: params.maxTokens ?? 1000,
        });

        context.logger.info('Chat completion created successfully');
        return response;
    } catch (error) {
        if (isUserAbortError(error)) {
            throw error;
        }
        context.logger.error('Failed to create chat completion', error);
        if (context.isAuthenticationError(error)) {
            await context.onAuthError();
            return undefined;
        }
        context.showError(t('errors.failedToCreateChatCompletion'), error);
        return undefined;
    }
}
