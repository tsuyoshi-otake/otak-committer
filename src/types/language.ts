import type { MessageStyle } from '../types/messageStyle';

export interface LanguageConfig {
    name: string;
    systemPrompt: (style: MessageStyle) => string;
    diffMessage: string;
}

export interface LanguageDescriptions {
    [key: string]: string;
}