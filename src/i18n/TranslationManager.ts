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
import en from './locales/en.json';
import ja from './locales/ja.json';
import vi from './locales/vi.json';
import ko from './locales/ko.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import zhCN from './locales/zh-cn.json';
import zhTW from './locales/zh-tw.json';

/**
 * Translation dictionary type
 */
type TranslationDictionary = {
    [key: string]: string | TranslationDictionary;
};

/**
 * Translation parameters type
 */
export type TranslationParams = Record<string, string | number>;

/**
 * Manages translations and provides the translation API
 */
export class TranslationManager {
    private locale: SupportedLocale;
    private translations: Record<SupportedLocale, TranslationDictionary>;

    private static instance: TranslationManager | null = null;

    /**
     * Creates a new TranslationManager instance
     *
     * Automatically detects the current locale from VS Code settings
     */
    constructor() {
        this.translations = {
            en: en as TranslationDictionary,
            ja: ja as TranslationDictionary,
            vi: vi as TranslationDictionary,
            ko: ko as TranslationDictionary,
            fr: fr as TranslationDictionary,
            de: de as TranslationDictionary,
            es: es as TranslationDictionary,
            pt: pt as TranslationDictionary,
            'zh-cn': zhCN as TranslationDictionary,
            'zh-tw': zhTW as TranslationDictionary,
        };
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
        let translation = this.getNestedValue(this.translations[this.locale], key);

        // Fallback to English if not found in current locale
        if (translation === undefined && this.locale !== 'en') {
            translation = this.getNestedValue(this.translations.en, key);
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
        return str.replace(/\{(\w+)\}/g, (match, key) => {
            if (params.hasOwnProperty(key)) {
                return String(params[key]);
            }
            return match; // Keep original placeholder if param not found
        });
    }

    /**
     * Get nested value from a translation dictionary using dot-separated key
     *
     * @param obj - Translation dictionary
     * @param key - Dot-separated key (e.g., 'messages.apiKeySaved')
     * @returns The translation string or undefined if not found
     */
    private getNestedValue(obj: TranslationDictionary, key: string): string | undefined {
        const parts = key.split('.');
        let current: TranslationDictionary | string = obj;

        for (const part of parts) {
            if (current === undefined || current === null || typeof current === 'string') {
                return undefined;
            }
            current = current[part];
        }

        return typeof current === 'string' ? current : undefined;
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
