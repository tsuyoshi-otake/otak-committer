import { LanguageConfig, PromptType } from '../types/language.js';

export const LANGUAGE_CONFIGS: { [key: string]: LanguageConfig } = {
    english: {
        name: 'English',
        async getPrompt(type: PromptType) {
            const { getEnglishPrompt } = await import('./english.js');
            return getEnglishPrompt(type);
        }
    },
    french: {
        name: 'Français',
        async getPrompt(type: PromptType) {
            const { getFrenchPrompt } = await import('./french.js');
            return getFrenchPrompt(type);
        }
    },
    german: {
        name: 'Deutsch',
        async getPrompt(type: PromptType) {
            const { getGermanPrompt } = await import('./german.js');
            return getGermanPrompt(type);
        }
    },
    italian: {
        name: 'Italiano',
        async getPrompt(type: PromptType) {
            const { getItalianPrompt } = await import('./italian.js');
            return getItalianPrompt(type);
        }
    },
    spanish: {
        name: 'Español',
        async getPrompt(type: PromptType) {
            const { getSpanishPrompt } = await import('./spanish.js');
            return getSpanishPrompt(type);
        }
    },
    portuguese: {
        name: 'Português',
        async getPrompt(type: PromptType) {
            const { getPortuguesePrompt } = await import('./portuguese.js');
            return getPortuguesePrompt(type);
        }
    },
    czech: {
        name: 'Čeština',
        async getPrompt(type: PromptType) {
            const { getCzechPrompt } = await import('./czech.js');
            return getCzechPrompt(type);
        }
    },
    hungarian: {
        name: 'Magyar',
        async getPrompt(type: PromptType) {
            const { getHungarianPrompt } = await import('./hungarian.js');
            return getHungarianPrompt(type);
        }
    },
    bulgarian: {
        name: 'Български',
        async getPrompt(type: PromptType) {
            const { getBulgarianPrompt } = await import('./bulgarian.js');
            return getBulgarianPrompt(type);
        }
    },
    turkish: {
        name: 'Türkçe',
        async getPrompt(type: PromptType) {
            const { getTurkishPrompt } = await import('./turkish.js');
            return getTurkishPrompt(type);
        }
    },
    polish: {
        name: 'Polski',
        async getPrompt(type: PromptType) {
            const { getPolishPrompt } = await import('./polish.js');
            return getPolishPrompt(type);
        }
    },
    russian: {
        name: 'Русский',
        async getPrompt(type: PromptType) {
            const { getRussianPrompt } = await import('./russian.js');
            return getRussianPrompt(type);
        }
    },
    japanese: {
        name: '日本語',
        async getPrompt(type: PromptType) {
            const { getJapanesePrompt } = await import('./japanese.js');
            return getJapanesePrompt(type);
        }
    },
    chinese: {
        name: '简体中文',
        async getPrompt(type: PromptType) {
            const { getChinesePrompt } = await import('./chinese.js');
            return getChinesePrompt(type);
        }
    },
    traditionalChinese: {
        name: '繁體中文',
        async getPrompt(type: PromptType) {
            const { getTraditionalChinesePrompt } = await import('./traditionalChinese.js');
            return getTraditionalChinesePrompt(type);
        }
    },
    korean: {
        name: '한국어',
        async getPrompt(type: PromptType) {
            const { getKoreanPrompt } = await import('./korean.js');
            return getKoreanPrompt(type);
        }
    },
    vietnamese: {
        name: 'Tiếng Việt',
        async getPrompt(type: PromptType) {
            const { getVietnamesePrompt } = await import('./vietnamese.js');
            return getVietnamesePrompt(type);
        }
    },
    thai: {
        name: 'ไทย',
        async getPrompt(type: PromptType) {
            const { getThaiPrompt } = await import('./thai.js');
            return getThaiPrompt(type);
        }
    },
    hindi: {
        name: 'हिन्दी',
        async getPrompt(type: PromptType) {
            const { getHindiPrompt } = await import('./hindi.js');
            return getHindiPrompt(type);
        }
    },
    bengali: {
        name: 'বাংলা',
        async getPrompt(type: PromptType) {
            const { getBengaliPrompt } = await import('./bengali.js');
            return getBengaliPrompt(type);
        }
    },
    javanese: {
        name: 'Basa Jawa',
        async getPrompt(type: PromptType) {
            const { getJavanesePrompt } = await import('./javanese.js');
            return getJavanesePrompt(type);
        }
    },
    tamil: {
        name: 'தமிழ்',
        async getPrompt(type: PromptType) {
            const { getTamilPrompt } = await import('./tamil.js');
            return getTamilPrompt(type);
        }
    },
    burmese: {
        name: 'မြန်မာစာ',
        async getPrompt(type: PromptType) {
            const { getBurmesePrompt } = await import('./burmese.js');
            return getBurmesePrompt(type);
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