/**
 * TranslationManager - Manages translations and provides the translation API
 *
 * This class provides a simple translation API with support for:
 * - Loading translations from JSON files
 * - Parameter interpolation using {paramName} syntax
 * - Fallback to English when translation is missing
 * - Locale switching at runtime
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
 * const manager = new TranslationManager();
 * const message = manager.t('messages.apiKeySaved');
 * const greeting = manager.t('messages.languageChanged', { language: 'Japanese' });
 * ```
 */

import { SupportedLocale, LocaleDetector } from './LocaleDetector';
import { getNestedTranslation, interpolateTranslation } from './translationLookup';
import { translations } from './translations';
import { TranslationParams } from './translationTypes';

export type { TranslationParams } from './translationTypes';

/**
 * Manages translations and provides the translation API
 */
export class TranslationManager {
    private locale: SupportedLocale;

    private static instance: TranslationManager | null = null;

    /**
     * Creates a new TranslationManager instance
     *
     * Automatically detects the current locale from VS Code settings
     */
    constructor() {
        this.locale = LocaleDetector.getLocale();
    }

    /**
     * Get the singleton instance of TranslationManager
     *
     * @returns The shared TranslationManager instance
     */
    static getInstance(): TranslationManager {
        if (!TranslationManager.instance) {
            TranslationManager.instance = new TranslationManager();
        }
        return TranslationManager.instance;
    }

    /**
     * Reset the singleton instance (for testing)
     */
    static resetInstance(): void {
        TranslationManager.instance = null;
    }

    /**
     * Get the current locale
     *
     * @returns Current locale ('ja', 'vi', 'ko', 'fr', 'de', 'es', 'pt', 'zh-cn', 'zh-tw', or 'en')
     */
    getLocale(): SupportedLocale {
        return this.locale;
    }

    /**
     * Update locale and reload translations
     *
     * @param locale - New locale ('ja', 'vi', 'ko', 'fr', 'de', 'es', 'pt', 'zh-cn', 'zh-tw', or 'en')
     */
    setLocale(locale: SupportedLocale): void {
        this.locale = locale;
    }

    /**
     * Get translated string
     *
     * @param key - Translation key (dot-separated, e.g., 'messages.apiKeySaved')
     * @param params - Optional parameters for string interpolation
     * @returns Translated string, or English fallback, or the key itself
     *
     * @example
     * ```typescript
     * t('messages.apiKeySaved') // Returns translated string
     * t('messages.languageChanged', { language: 'Japanese' }) // With parameter
     * ```
     */
    t(key: string, params?: TranslationParams): string {
        // Try to get translation in current locale
        let translation = getNestedTranslation(translations[this.locale], key);

        // Fallback to English if not found in current locale
        if (translation === undefined && this.locale !== 'en') {
            translation = getNestedTranslation(translations.en, key);
        }

        // Fallback to key itself if not found in any translation
        if (translation === undefined) {
            return key;
        }

        // Apply parameter interpolation if params provided
        if (params) {
            return this.interpolate(translation, params);
        }

        return translation;
    }

    /**
     * Interpolate parameters into a string
     *
     * Replaces {paramName} placeholders with corresponding values from params
     *
     * @param str - String with {paramName} placeholders
     * @param params - Parameters to interpolate
     * @returns String with placeholders replaced
     *
     * @example
     * ```typescript
     * interpolate('Hello {name}!', { name: 'World' }) // Returns 'Hello World!'
     * ```
     */
    interpolate(str: string, params: TranslationParams): string {
        return interpolateTranslation(str, params);
    }
}

/**
 * Global translation function
 *
 * Convenience function that uses the singleton TranslationManager instance
 *
 * @param key - Translation key
 * @param params - Optional parameters for string interpolation
 * @returns Translated string
 *
 * @example
 * ```typescript
 * import { t } from './i18n';
 * const message = t('messages.apiKeySaved');
 * ```
 */
export function t(key: string, params?: TranslationParams): string {
    return TranslationManager.getInstance().t(key, params);
}
