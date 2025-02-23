import { LanguageConfig, PromptType } from '../types/language';

export const LANGUAGE_CONFIGS: { [key: string]: LanguageConfig } = {
    japanese: {
        name: '日本語',
        async getPrompt(type: PromptType) {
            const { getAsianPrompt } = await import('./asian.js');
            return getAsianPrompt(type);
        }
    },
    english: {
        name: 'English',
        async getPrompt(type: PromptType) {
            const { getEuropeanPrompt } = await import('./european.js');
            return getEuropeanPrompt(type);
        }
    },
    korean: {
        name: '한국어',
        async getPrompt(type: PromptType) {
            const { getAsianPrompt } = await import('./asian.js');
            return getAsianPrompt(type);
        }
    },
    chinese: {
        name: '中文',
        async getPrompt(type: PromptType) {
            const { getAsianPrompt } = await import('./asian.js');
            return getAsianPrompt(type);
        }
    },
    arabic: {
        name: 'العربية',
        async getPrompt(type: PromptType) {
            const { getMiddleEasternPrompt } = await import('./middleEastern.js');
            return getMiddleEasternPrompt(type);
        }
    },
    hebrew: {
        name: 'עברית',
        async getPrompt(type: PromptType) {
            const { getMiddleEasternPrompt } = await import('./middleEastern.js');
            return getMiddleEasternPrompt(type);
        }
    }
};