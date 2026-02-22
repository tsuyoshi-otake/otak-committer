import { Logger } from '../infrastructure/logging/Logger';
import { IssueType } from '../types/issue';
import { OpenAIService } from './openai';

const MAX_TITLE_TOKENS = 50;

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
            temperature: 0.1,
            maxTokens: MAX_TITLE_TOKENS,
        });

        logger.info('Title generated successfully');
        return title || description.slice(0, MAX_TITLE_TOKENS);
    } catch (error) {
        logger.error('Failed to generate title', error);
        return description.slice(0, MAX_TITLE_TOKENS);
    }
}

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
