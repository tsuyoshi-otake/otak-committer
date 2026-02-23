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
 * - French (fr)
 * - German (de)
 * - Spanish (es)
 * - Portuguese (pt)
 * - Simplified Chinese (zh-cn)
 * - Traditional Chinese (zh-tw)
 * - Italian (it)
 * - Czech (cs)
 * - Hungarian (hu)
 * - Bulgarian (bg)
 * - Turkish (tr)
 * - Polish (pl)
 * - Russian (ru)
 * - Thai (th)
 * - Hindi (hi)
 * - Bengali (bn)
 * - Javanese (jv)
 * - Tamil (ta)
 * - Burmese (my)
 * - Arabic (ar)
 * - Hebrew (he)
 * - English (en)
 *
 * @example
 * ```typescript
 * const locale = LocaleDetector.getLocale(); // Returns 'ja' or 'en'
 * ```
 */

/**
 * Supported locale types
 */
export type SupportedLocale = 'ja' | 'vi' | 'ko' | 'fr' | 'de' | 'es' | 'pt' | 'zh-cn' | 'zh-tw' | 'it' | 'cs' | 'hu' | 'bg' | 'tr' | 'pl' | 'ru' | 'th' | 'hi' | 'bn' | 'jv' | 'ta' | 'my' | 'ar' | 'he' | 'en';

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
     * @returns Supported locale code ('ja', 'vi', 'ko', 'fr', 'de', 'es', 'pt', 'zh-cn', 'zh-tw', or 'en')
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
     * @returns Supported locale code
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

        // Check if language starts with 'fr' (handles 'fr', 'fr-FR', etc.)
        if (lowerLang.startsWith('fr')) {
            return 'fr';
        }

        // Check if language starts with 'de' (handles 'de', 'de-DE', etc.)
        if (lowerLang.startsWith('de')) {
            return 'de';
        }

        // Check if language starts with 'es' (handles 'es', 'es-ES', etc.)
        if (lowerLang.startsWith('es')) {
            return 'es';
        }

        // Check if language starts with 'pt' (handles 'pt', 'pt-BR', 'pt-PT', etc.)
        if (lowerLang.startsWith('pt')) {
            return 'pt';
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

        // Italian
        if (lowerLang.startsWith('it')) {
            return 'it';
        }

        // Czech
        if (lowerLang.startsWith('cs')) {
            return 'cs';
        }

        // Hungarian
        if (lowerLang.startsWith('hu')) {
            return 'hu';
        }

        // Bulgarian
        if (lowerLang.startsWith('bg')) {
            return 'bg';
        }

        // Turkish
        if (lowerLang.startsWith('tr')) {
            return 'tr';
        }

        // Polish
        if (lowerLang.startsWith('pl')) {
            return 'pl';
        }

        // Russian
        if (lowerLang.startsWith('ru')) {
            return 'ru';
        }

        // Thai
        if (lowerLang.startsWith('th')) {
            return 'th';
        }

        // Hindi
        if (lowerLang.startsWith('hi')) {
            return 'hi';
        }

        // Bengali
        if (lowerLang.startsWith('bn')) {
            return 'bn';
        }

        // Javanese
        if (lowerLang.startsWith('jv')) {
            return 'jv';
        }

        // Tamil
        if (lowerLang.startsWith('ta')) {
            return 'ta';
        }

        // Burmese
        if (lowerLang.startsWith('my')) {
            return 'my';
        }

        // Arabic
        if (lowerLang.startsWith('ar')) {
            return 'ar';
        }

        // Hebrew
        if (lowerLang.startsWith('he')) {
            return 'he';
        }

        // Default to English for all other languages
        return 'en';
    }
}
