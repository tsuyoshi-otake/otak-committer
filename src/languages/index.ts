import { LanguageConfig, PromptType } from '../types/language';

export const LANGUAGE_CONFIGS: { [key: string]: LanguageConfig } = {
    japanese: {
        name: '日本語',
        async getPrompt(type: PromptType) {
            const { getJapanesePrompt } = await import('./japanese.js');
            return getJapanesePrompt(type);
        }
    },
    english: {
        name: 'English',
        async getPrompt(type: PromptType) {
            const { getEnglishPrompt } = await import('./english.js');
            return getEnglishPrompt(type);
        }
    },
    korean: {
        name: '한국어',
        async getPrompt(type: PromptType) {
            const { getKoreanPrompt } = await import('./korean.js');
            return getKoreanPrompt(type);
        }
    },
    chinese: {
        name: '中文',
        async getPrompt(type: PromptType) {
            const { getChinesePrompt } = await import('./chinese.js');
            return getChinesePrompt(type);
        }
    },
    arabic: {
        name: 'العربية',
        async getPrompt(type: PromptType) {
            const { getArabicPrompt } = await import('./arabic.js');
            return getArabicPrompt(type);
        }
    },
    hebrew: {
        name: 'עברית',
        async getPrompt(type: PromptType) {
            const { getHebrewPrompt } = await import('./hebrew.js');
            return getHebrewPrompt(type);
        }
    }
};