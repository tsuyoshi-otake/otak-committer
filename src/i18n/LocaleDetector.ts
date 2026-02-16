/**
 * LocaleDetector - Detects the current VS Code display language
 *
 * This class provides locale detection functionality for the i18n system.
 * It uses VS Code's display language setting to determine which language
 * to use for translations.
 *
 * Supported languages:
 * - Japanese (ja)
 * - Vietnamese (vi)
 * - Korean (ko)
 * - Simplified Chinese (zh-cn)
 * - Traditional Chinese (zh-tw)
 * - English (en)
 *
 * Note: We intentionally only localize the extension UI to Japanese, Vietnamese, Korean, and Chinese (Simplified/Traditional), plus English.
 * For any other VS Code display language, the extension UI falls back to English.
 *
 * @example
 * ```typescript
 * const locale = LocaleDetector.getLocale(); // Returns 'ja' or 'en'
 * ```
 */

/**
 * Supported locale types
 */
export type SupportedLocale = 'ja' | 'vi' | 'ko' | 'zh-cn' | 'zh-tw' | 'en';

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
     * @returns Supported locale code ('ja', 'vi', 'ko', 'zh-cn', 'zh-tw', or 'en')
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
     * @param language - The language code to detect (e.g., 'ja', 'ja-JP', 'en', 'en-US')
     * @returns Supported locale code ('ja', 'vi', 'ko', 'zh-cn', 'zh-tw', or 'en')
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

        // Check Chinese variants.
        // VS Code typically uses 'zh-cn' and 'zh-tw', but handle common BCP-47 variants too.
        if (lowerLang.startsWith('zh')) {
            // Traditional Chinese
            if (
                lowerLang.startsWith('zh-tw') ||
                lowerLang.startsWith('zh-hant') ||
                lowerLang.startsWith('zh-hk') ||
                lowerLang.startsWith('zh-mo')
            ) {
                return 'zh-tw';
            }

            // Default Chinese to Simplified.
            return 'zh-cn';
        }

        // Default to English for all other languages
        return 'en';
    }
}
