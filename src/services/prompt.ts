import * as vscode from 'vscode';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { TemplateInfo } from '../types';
import { COMMIT_PREFIXES, CommitPrefix } from '../constants/commitGuide';
import {
    extractFilePathsFromDiff,
    generateScopeHint,
    getConventionalCommitsFormat,
    getTraditionalFormat,
} from '../utils/conventionalCommits';

/**
 * Message length limits by style (in characters)
 * Updated to provide longer commit messages for better context
 */
export const MESSAGE_LENGTH_LIMITS = {
    [MessageStyle.Simple]: 200,
    [MessageStyle.Normal]: 400,
    [MessageStyle.Detailed]: 800,
} as const;

/**
 * Get the character limit for a given message style
 * @param style - The message style
 * @returns The character limit
 */
export function getMessageLengthLimit(style: MessageStyle | string): number {
    if (style === MessageStyle.Simple) {
        return MESSAGE_LENGTH_LIMITS[MessageStyle.Simple];
    }
    if (style === MessageStyle.Detailed) {
        return MESSAGE_LENGTH_LIMITS[MessageStyle.Detailed];
    }
    return MESSAGE_LENGTH_LIMITS[MessageStyle.Normal];
}

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
    /** Maximum allowed length for customMessage configuration value */
    private static readonly MAX_CUSTOM_MESSAGE_LENGTH = 500;

    /** Maximum allowed length for template content included in prompts */
    private static readonly MAX_TEMPLATE_CONTENT_LENGTH = 10000;

    /**
     * Sanitize user-provided configuration input to limit prompt injection risk
     */
    static sanitizeConfigInput(input: string): string {
        if (!input) {
            return '';
        }
        return input.slice(0, PromptService.MAX_CUSTOM_MESSAGE_LENGTH).trim();
    }

    /**
     * Sanitize template content before including in prompts
     */
    static sanitizeTemplateContent(content: string): string {
        if (!content) {
            return '';
        }
        return content.slice(0, PromptService.MAX_TEMPLATE_CONTENT_LENGTH).trim();
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
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const useEmoji = config.get<boolean>('useEmoji') || false;
        const rawCustomMessage = config.get<string>('customMessage') || '';
        const useConventionalCommits = config.get<boolean>('useConventionalCommits') ?? false;

        const emojiInstruction = useEmoji
            ? 'Feel free to use emojis for emphasis and key points.'
            : 'DO NOT use any emojis in the content.';
        const customMessage = PromptService.sanitizeConfigInput(rawCustomMessage);
        const customInstruction = customMessage
            ? `\nAdditional requirements: ${customMessage}`
            : '';

        // テンプレートがある場合はそれを基に生成 (Templates override Conventional Commits format)
        if (template) {
            const sanitizedTemplate = PromptService.sanitizeTemplateContent(template.content);
            return `Based on the following template and Git diff, generate a commit message:

Template:
${sanitizedTemplate}

Git diff:
${diff}

Please follow the template format strictly without any leading newlines.`;
        }

        // テンプレートがない場合はPrefixを使用
        const prefixDescriptions = COMMIT_PREFIXES.map((prefix) => {
            const desc =
                prefix.description[language as keyof CommitPrefix['description']] ||
                prefix.description.english;
            return `${prefix.prefix}: ${desc}`;
        }).join('\n');

        // Get the character limit for the message style
        const charLimit = getMessageLengthLimit(messageStyle);

        // Extract file paths and generate scope hint
        const filePaths = extractFilePathsFromDiff(diff);
        const scopeHint = generateScopeHint(filePaths);

        // Determine format instruction based on configuration
        const formatInstruction = useConventionalCommits
            ? getConventionalCommitsFormat(scopeHint)
            : getTraditionalFormat(scopeHint);

        return `Generate a commit message in ${language} for the following Git diff.
Use one of these prefixes:

${prefixDescriptions}

The commit message should follow this format without any leading newlines:
${formatInstruction}

<body>

The total commit message should be under ${charLimit} characters.
The style should be: ${messageStyle}

Git diff:
${diff}

Please provide a clear and ${messageStyle} commit message following the format above.
${emojiInstruction}${customInstruction}`;
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
        return `Changed files:
${diff.files.map((file) => `- ${file.filename} (additions: ${file.additions}, deletions: ${file.deletions})`).join('\n')}

Detailed changes:
${diff.files
    .map(
        (file) => `
[${file.filename}]
${file.patch}`,
    )
    .join('\n')}`;
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
    ): Promise<{ title: string; body: string }> {
        const diffSummary = await this.generateDiffSummary(diff);
        const useEmoji =
            vscode.workspace.getConfiguration('otakCommitter').get<boolean>('useEmoji') || false;
        const rawCustomMessage =
            vscode.workspace.getConfiguration('otakCommitter').get<string>('customMessage') || '';
        const emojiInstruction = useEmoji ? '' : 'DO NOT use any emojis in the content. ';
        const customMessage = PromptService.sanitizeConfigInput(rawCustomMessage);
        const customInstruction = customMessage
            ? `Additional requirements: ${customMessage}\n\n`
            : '';

        const titlePrompt = `Generate a Pull Request title in ${language}.

Requirements:
1. Title should be concise and accurately represent the changes
2. Include a prefix (e.g., "Feature:", "Fix:", "Improvement:", etc.) ${useEmoji ? 'with appropriate emoji prefix' : 'without emoji'}

${customInstruction}Git diff: ${diffSummary}`;

        const bodyPrompt = template
            ? `Based on the following template and Git diff, generate a pull request:

NOTE: Generate the content in ${language}.

Template:
${PromptService.sanitizeTemplateContent(template.content)}

Git diff:
${diffSummary}

Please follow the template format strictly and ensure all content is in ${language}. ${emojiInstruction}${customInstruction}`
            : `Generate a detailed Pull Request description in ${language} for the following changes.

# Overview
- Brief explanation of implemented features or fixes
- Purpose and background of changes
- Technical approach taken

# Key Review Points
- Areas that need special attention from reviewers
- Important design decisions
- Performance and maintainability considerations

# Change Details
- Main changes implemented
- Affected components and functionality
- Dependency changes (if any)

# Additional Notes
- Deployment considerations
- Impact on existing features
- Required configuration or environment variables

Git diff:
${diffSummary}

Note: Please ensure all content is written in ${language}. ${emojiInstruction}${customInstruction}`;

        return {
            title: titlePrompt,
            body: bodyPrompt,
        };
    }

    /**
     * Create a prompt for summarizing a chunk of diff content (Tier 3 map-reduce)
     *
     * @param chunkDiff - The chunk of diff content to summarize
     * @param language - The target language for the summary
     * @returns The summarization prompt string
     */
    createSummarizationPrompt(chunkDiff: string, language: string): string {
        return `Summarize the following code changes concisely in ${language}. Focus on:
- What was changed (files, functions, components)
- Why it was likely changed (bug fix, feature, refactor)
- Key technical details

Changes:
${chunkDiff}

Provide a concise technical summary.`;
    }
}
