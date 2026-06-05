/**
 * Internationalization (i18n) module for otak-committer extension
 *
 * Provides multi-language support for the extension UI.
 * Supports 25 languages matching commit message language support.
 *
 * @example
 * ```typescript
 * import { t, TranslationManager, LocaleDetector } from './i18n';
 *
 * // Use the global translation function
 * const message = t('messages.apiKeySaved');
 *
 * // With parameters
 * const greeting = t('messages.languageChanged', { language: 'Japanese' });
 *
 * // Access the singleton instance for more control
 * const manager = TranslationManager.getInstance();
 * manager.setLocale('ja');
 * ```
 */

export { LocaleDetector, SupportedLocale, Locale } from './LocaleDetector';
export { TranslationManager, t } from './TranslationManager';
export type { TranslationParams } from './translationTypes';
export { LanguagePreferenceManager } from './LanguagePreferenceManager';
export {
    LANGUAGE_NAME_TO_LOCALE,
    LOCALE_TO_LANGUAGE_MAP,
    SUPPORTED_LOCALES,
    isSupportedLocale,
} from './supportedLocales';
