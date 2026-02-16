/**
 * Internationalization (i18n) module for otak-committer extension
 *
 * Provides multi-language support for the extension UI.
 * Supports Japanese and English.
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
 * manager.setLocale('ja'); // or 'en'
 * ```
 */

export { LocaleDetector, SupportedLocale, Locale } from './LocaleDetector';
export { TranslationManager, TranslationParams, t } from './TranslationManager';
export { LanguagePreferenceManager } from './LanguagePreferenceManager';
