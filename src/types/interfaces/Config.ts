import { ReasoningEffort } from '../enums/ReasoningEffort';

/**
 * Service configuration with API keys and settings
 */
export interface ServiceConfig {
    openaiApiKey?: string;
    githubToken?: string;
    language: string;
    messageStyle: string;
    useEmoji: boolean;
    /** GPT reasoning effort (none/low/medium/high) */
    reasoningEffort?: ReasoningEffort;
}

/**
 * Message style configuration with token limits
 */
export interface MessageStyleConfig {
    tokens: {
        commit: number;
        pr: number;
    };
    description: string;
}

/**
 * Emoji configuration
 */
export interface EmojiConfig {
    enabled: boolean;
    style: 'github' | 'unicode';
}

/**
 * Language configuration
 */
export interface LanguageConfig {
    name: string;
    label: string;
    description: string;
    isRTL?: boolean;
}

/**
 * Language settings
 */
export interface LanguageSettings {
    language: string;
    messageStyle: string;
}
