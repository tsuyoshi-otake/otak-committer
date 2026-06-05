import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { TemplateInfo } from '../types';
import {
    getPromptGenerationOptions,
    sanitizeConfigInput,
    sanitizeTemplateContent,
} from './promptConfig';
import { createCommitPromptContent } from './commitPrompt';
import { createPRPromptContent, generateDiffSummaryContent } from './prPrompt';
import { createSummarizationPromptContent } from './summarizationPrompt';

/**
 * Service for creating prompts for AI models
 *
 * Generates structured prompts for commit messages, pull requests,
 * and other AI-powered content generation.
 *
 * @example
 * ```typescript
 * const promptService = new PromptService();
 * const prompt = await promptService.createCommitPrompt(diff, 'english', 'normal');
 * ```
 */
export class PromptService {
    /**
     * Sanitize user-provided configuration input to limit prompt injection risk
     */
    static sanitizeConfigInput(input: string): string {
        return sanitizeConfigInput(input);
    }

    /**
     * Sanitize template content before including in prompts
     */
    static sanitizeTemplateContent(content: string): string {
        return sanitizeTemplateContent(content);
    }

    /**
     * Create a prompt for generating commit messages
     *
     * Generates a structured prompt that includes the diff, language preferences,
     * message style, and optional template.
     *
     * @param diff - The Git diff to analyze
     * @param language - The target language for the commit message
     * @param messageStyle - The style of the message (simple, normal, detailed)
     * @param template - Optional commit message template
     * @returns The generated prompt string
     *
     * @example
     * ```typescript
     * const prompt = await promptService.createCommitPrompt(
     *   diff,
     *   'english',
     *   MessageStyle.Normal
     * );
     * ```
     */
    async createCommitPrompt(
        diff: string,
        language: string,
        messageStyle: MessageStyle | string,
        template?: TemplateInfo,
    ): Promise<string> {
        return createCommitPromptContent(
            diff,
            language,
            messageStyle,
            template,
            getPromptGenerationOptions(),
        );
    }

    /**
     * Generate a summary of a pull request diff
     *
     * Creates a formatted summary of changed files and their modifications.
     *
     * @param diff - The pull request diff information
     * @returns Formatted diff summary string
     *
     * @example
     * ```typescript
     * const summary = await promptService.generateDiffSummary(diff);
     * console.log(summary);
     * ```
     */
    async generateDiffSummary(diff: PullRequestDiff): Promise<string> {
        return generateDiffSummaryContent(diff);
    }

    /**
     * Create prompts for generating pull request content
     *
     * Generates separate prompts for PR title and body based on the diff
     * and optional template.
     *
     * @param diff - The pull request diff information
     * @param language - The target language for the PR content
     * @param template - Optional PR template
     * @returns Object containing title and body prompts
     *
     * @example
     * ```typescript
     * const prompts = await promptService.createPRPrompt(diff, 'english');
     * console.log('Title prompt:', prompts.title);
     * console.log('Body prompt:', prompts.body);
     * ```
     */
    async createPRPrompt(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo,
    ): Promise<string> {
        const diffSummary = await this.generateDiffSummary(diff);
        return createPRPromptContent(diffSummary, language, template, getPromptGenerationOptions());
    }

    /**
     * Create a prompt for summarizing a chunk of diff content (Tier 3 map-reduce)
     *
     * @param chunkDiff - The chunk of diff content to summarize
     * @param language - The target language for the summary
     * @returns The summarization prompt string
     */
    createSummarizationPrompt(chunkDiff: string, language: string): string {
        return createSummarizationPromptContent(chunkDiff, language);
    }
}
