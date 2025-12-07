/**
 * LocaleDetector - Detects the current VS Code display language
 *
 * This class provides locale detection functionality for the i18n system.
 * It uses VS Code's display language setting to determine which language
 * to use for translations.
 *
 * Supported languages:
 * - Japanese (ja)
 * - English (en)
 * - Vietnamese (vi)
 * - Korean (ko)
 * - Chinese Simplified (zh-cn)
 * - Chinese Traditional (zh-tw)
 *
 * @example
 * ```typescript
 * const locale = LocaleDetector.getLocale(); // Returns 'ja', 'en', 'vi', 'ko', 'zh-cn', or 'zh-tw'
 * ```
 */

/**
 * Supported locale types
 */
export type SupportedLocale = 'ja' | 'en' | 'vi' | 'ko' | 'zh-cn' | 'zh-tw';

/**
 * @deprecated Use SupportedLocale instead
 */
export type Locale = SupportedLocale;

/**
 * Detects the current VS Code display language
 */
export class LocaleDetector {
    /**
     * Get the current locale based on VS Code's display language
     *
     * @returns Supported locale code ('ja', 'en', 'vi', 'ko', 'zh-cn', 'zh-tw')
     */
    static getLocale(): SupportedLocale {
        try {
            // Dynamic import to avoid issues when running outside VS Code
            const vscode = require('vscode');
            return this.detectLocale(vscode.env.language);
        } catch {
            // If vscode module is not available, default to English
            return 'en';
        }
    }

    /**
     * Detect locale from a language code string
     *
     * This method is public for testing purposes.
     *
     * @param language - The language code to detect (e.g., 'ja', 'ja-JP', 'vi', 'vi-VN', 'ko', 'ko-KR', 'zh-cn', 'zh-hans', 'zh-tw', 'zh-hant', 'en', 'en-US')
     * @returns Supported locale code ('ja', 'en', 'vi', 'ko', 'zh-cn', 'zh-tw')
     */
    static detectLocale(language: string | undefined): SupportedLocale {
        if (!language) {
            return 'en';
        }

        const lowerLang = language.toLowerCase();

        // Check if language starts with 'ja' (handles 'ja', 'ja-JP', etc.)
        if (lowerLang.startsWith('ja')) {
            return 'ja';
        }

        // Check if language starts with 'vi' (handles 'vi', 'vi-VN', etc.)
        if (lowerLang.startsWith('vi')) {
            return 'vi';
        }

        // Check if language starts with 'ko' (handles 'ko', 'ko-KR', etc.)
        if (lowerLang.startsWith('ko')) {
            return 'ko';
        }

        // Check if language is Chinese Simplified (zh-cn or zh-hans)
        if (lowerLang === 'zh-cn' || lowerLang === 'zh-hans') {
            return 'zh-cn';
        }

        // Check if language is Chinese Traditional (zh-tw or zh-hant)
        if (lowerLang === 'zh-tw' || lowerLang === 'zh-hant') {
            return 'zh-tw';
        }

        // Default to English for all other languages
        return 'en';
    }
}
