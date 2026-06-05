import * as vscode from 'vscode';
import { MessageStyle } from '../types/enums/MessageStyle';

/**
 * Message length limits by style (in characters).
 */
export const MESSAGE_LENGTH_LIMITS = {
    [MessageStyle.Simple]: 600,
    [MessageStyle.Normal]: 1200,
    [MessageStyle.Detailed]: 2400,
} as const;

/**
 * User-controlled options that shape the generated commit or PR prompt.
 */
export interface PromptGenerationOptions {
    useEmoji: boolean;
    customMessage: string;
    useConventionalCommits: boolean;
    useBulletList: boolean;
}

const MAX_CUSTOM_MESSAGE_LENGTH = 500;
const MAX_TEMPLATE_CONTENT_LENGTH = 10000;

/**
 * Get the character limit for a given message style.
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
 * Sanitize user-provided configuration input to limit prompt injection risk.
 */
export function sanitizeConfigInput(input: string): string {
    if (!input) {
        return '';
    }
    return input.slice(0, MAX_CUSTOM_MESSAGE_LENGTH).trim();
}

/**
 * Sanitize template content before including in prompts.
 */
export function sanitizeTemplateContent(content: string): string {
    if (!content) {
        return '';
    }
    return content.slice(0, MAX_TEMPLATE_CONTENT_LENGTH).trim();
}

/**
 * Read prompt generation options from the extension's VS Code configuration
 *
 * @returns The sanitized prompt generation options derived from user settings
 */
export function getPromptGenerationOptions(): PromptGenerationOptions {
    const config = vscode.workspace.getConfiguration('otakCommitter');
    const rawCustomMessage = config.get<string>('customMessage') || '';

    return {
        useEmoji: config.get<boolean>('useEmoji') || false,
        customMessage: sanitizeConfigInput(rawCustomMessage),
        useConventionalCommits: config.get<boolean>('useConventionalCommits') ?? true,
        useBulletList: config.get<boolean>('useBulletList') ?? true,
    };
}
