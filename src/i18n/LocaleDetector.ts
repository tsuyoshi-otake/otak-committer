/**
 * LocaleDetector - Detects the current VS Code display language
 *
 * This class provides locale detection functionality for the i18n system.
 * It uses VS Code's display language setting to determine whether to use
 * Japanese or English translations.
 *
 * @example
 * ```typescript
 * const locale = LocaleDetector.getLocale(); // Returns 'ja' or 'en'
 * ```
 */

/**
 * Supported locale types
 */
export type Locale = 'ja' | 'en';

/**
 * Detects the current VS Code display language
 */
export class LocaleDetector {
    /**
     * Get the current locale based on VS Code's display language
     *
     * @returns 'ja' for Japanese, 'en' for English or other languages
     */
    static getLocale(): Locale {
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
     * @returns 'ja' for Japanese, 'en' for all other languages
     */
    static detectLocale(language: string | undefined): Locale {
        if (!language) {
            return 'en';
        }

        // Check if language starts with 'ja' (handles 'ja', 'ja-JP', etc.)
        if (language.toLowerCase().startsWith('ja')) {
            return 'ja';
        }

        // Default to English for all other languages
        return 'en';
    }
}
