import { Logger } from '../infrastructure/logging/Logger';
import { IssueType } from '../types/interfaces/Issue';
import { OpenAIService } from './openai';

const MAX_TITLE_TOKENS = 50;

/**
 * Build the catalog of issue types offered to the user, optionally including emoji
 *
 * @param useEmoji - When true, prefix each label with an emoji
 * @returns The list of available issue types
 */
export function getAvailableIssueTypes(useEmoji: boolean): IssueType[] {
    return [
        {
            label: useEmoji ? '📋 Task' : 'Task',
            description: 'General task or improvement',
            type: 'task',
        },
        {
            label: useEmoji ? '🐛 Bug Report' : 'Bug Report',
            description: 'Report a bug',
            type: 'bug',
        },
        {
            label: useEmoji ? '✨ Feature Request' : 'Feature Request',
            description: 'Request a new feature',
            type: 'feature',
        },
        {
            label: useEmoji ? '📝 Documentation' : 'Documentation',
            description: 'Documentation improvement',
            type: 'docs',
        },
        {
            label: useEmoji ? '🔧 Refactoring' : 'Refactoring',
            description: 'Code improvement',
            type: 'refactor',
        },
    ];
}

/**
 * Generate a concise issue title using the AI model, falling back to a truncated description on failure
 *
 * @param openai - OpenAI service used to request the title
 * @param type - Issue type label included in the prompt context
 * @param description - User-provided description summarizing the issue
 * @param language - Natural language to write the title in
 * @param logger - Logger used for diagnostics
 * @returns The generated title or a truncated fallback
 */
export async function generateTitle(
    openai: OpenAIService,
    type: string,
    description: string,
    language: string,
    logger: Logger,
): Promise<string> {
    try {
        logger.debug(`Generating title for ${type}`);

        const title = await openai.createChatCompletion({
            prompt: `Create a concise title (maximum ${MAX_TITLE_TOKENS} characters) in ${language} for this ${type} based on the following description:\n\n${description}\n\nRequirements:\n- Must be in ${language}\n- Maximum ${MAX_TITLE_TOKENS} characters\n- Clear and descriptive\n- No technical jargon unless necessary`,
            maxTokens: MAX_TITLE_TOKENS,
        });

        logger.info('Title generated successfully');
        return title || description.slice(0, MAX_TITLE_TOKENS);
    } catch (error) {
        logger.error('Failed to generate title', error);
        return description.slice(0, MAX_TITLE_TOKENS);
    }
}

/**
 * Build the prompt used to ask the AI model to generate a GitHub issue body
 *
 * @param analysisResult - Formatted repository analysis to include for context
 * @param description - User-provided description of the issue
 * @param useEmoji - When true, allow emoji in headers and key points
 * @param customMessage - Optional additional instructions appended to the prompt
 * @returns The composed prompt string for issue body generation
 */
export function buildIssueBodyPrompt(
    analysisResult: string,
    description: string,
    useEmoji: boolean,
    customMessage: string,
): string {
    const emojiInstruction = useEmoji
        ? 'Use emojis for section headers and key points.'
        : 'DO NOT use any emojis in the content.';
    const customInstruction = customMessage ? `\n\nAdditional requirements: ${customMessage}` : '';

    return `Generate a GitHub issue in recommended format for the following analysis and description. Include appropriate sections like Background, Problem Statement, Expected Behavior, Steps to Reproduce (if applicable), and Additional Context. Keep the technical details but organize them well.\n\n${emojiInstruction}${customInstruction}\n\nRepository Analysis:\n${analysisResult}\n\nUser Description: ${description}`;
}
