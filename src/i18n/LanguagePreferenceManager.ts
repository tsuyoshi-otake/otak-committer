/**
 * LanguagePreferenceManager - Manages user's language preference for commit message generation
 *
 * This class provides functionality to:
 * - Get the preferred language for commit messages
 * - Set user's preferred language
 * - Clear the preference to revert to auto-detection
 * - Check if user has set a manual preference
 *
 * The preference is stored in VS Code's workspace configuration under 'otakCommitter.commitLanguage'.
 *
 * @example
 * ```typescript
 * // Set preference
 * await LanguagePreferenceManager.setPreferredLanguage('ja');
 *
 * // Get preferred language (returns user preference or UI locale)
 * const lang = LanguagePreferenceManager.getPreferredLanguage();
 *
 * // Check if user has set a preference
 * if (LanguagePreferenceManager.hasPreference()) {
 *   console.log('User has set a language preference');
 * }
 *
 * // Clear preference to revert to auto-detection
 * await LanguagePreferenceManager.clearPreferredLanguage();
 * ```
 */

import { SupportedLocale, LocaleDetector } from './LocaleDetector';

/**
 * Configuration key for commit language preference
 */
const CONFIG_KEY = 'commitLanguage';
const CONFIG_SECTION = 'otakCommitter';

/**
 * Maps UI locales to commit message language names
 * Used to integrate with the existing language system in src/languages/
 */
export const LOCALE_TO_LANGUAGE_MAP: Record<SupportedLocale, string> = {
    'ja': 'japanese',
    'en': 'english',
    'vi': 'vietnamese',
    'ko': 'korean',
    'zh-cn': 'chinese',
    'zh-tw': 'traditionalChinese'
};

/**
 * Manages user's language preference for commit message generation
 */
export class LanguagePreferenceManager {
    /**
     * Internal storage for preference (used when vscode is not available)
     * This is primarily for testing purposes
     */
    private static internalPreference: SupportedLocale | undefined = undefined;

    /**
     * Get the preferred language for commit messages
     *
     * If user has manually set a language, returns that language.
     * Otherwise, returns the current UI locale.
     *
     * @returns Preferred language code
     */
    static getPreferredLanguage(): SupportedLocale {
        // Check if user has set a preference
        const preference = this.getStoredPreference();
        if (preference) {
            return preference;
        }

        // Fall back to UI locale
        return LocaleDetector.getLocale();
    }

    /**
     * Set user's preferred language for commit messages
     *
     * @param locale - Language to use for commit messages
     */
    static async setPreferredLanguage(locale: SupportedLocale): Promise<void> {
        try {
            const vscode = require('vscode');
            const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
            await config.update(CONFIG_KEY, locale, vscode.ConfigurationTarget.Global);
        } catch {
            // If vscode is not available (e.g., in tests), use internal storage
            this.internalPreference = locale;
        }
    }

    /**
     * Clear user's language preference (revert to auto-detection)
     */
    static async clearPreferredLanguage(): Promise<void> {
        try {
            const vscode = require('vscode');
            const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
            await config.update(CONFIG_KEY, undefined, vscode.ConfigurationTarget.Global);
        } catch {
            // If vscode is not available (e.g., in tests), clear internal storage
            this.internalPreference = undefined;
        }
    }

    /**
     * Check if user has manually set a language preference
     *
     * @returns True if user has set a preference
     */
    static hasPreference(): boolean {
        return this.getStoredPreference() !== undefined;
    }

    /**
     * Get the stored preference from configuration or internal storage
     *
     * @returns The stored preference or undefined
     */
    private static getStoredPreference(): SupportedLocale | undefined {
        try {
            const vscode = require('vscode');
            const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
            const preference = config.get(CONFIG_KEY) as string | undefined;

            if (preference && this.isValidLocale(preference)) {
                return preference as SupportedLocale;
            }
            return undefined;
        } catch {
            // If vscode is not available (e.g., in tests), use internal storage
            return this.internalPreference;
        }
    }

    /**
     * Validate if a string is a valid supported locale
     *
     * @param locale - The locale string to validate
     * @returns True if the locale is valid
     */
    private static isValidLocale(locale: string): boolean {
        const validLocales: SupportedLocale[] = ['ja', 'en', 'vi', 'ko', 'zh-cn', 'zh-tw'];
        return validLocales.includes(locale as SupportedLocale);
    }

    /**
     * Reset internal state (for testing purposes)
     */
    static resetForTesting(): void {
        this.internalPreference = undefined;
    }

    /**
     * Get the language name for commit message generation
     *
     * This maps the UI locale to the language name used in the existing
     * language system (src/languages/).
     *
     * @returns Language name (e.g., 'japanese', 'english', 'vietnamese', etc.)
     */
    static getCommitLanguageName(): string {
        const locale = this.getPreferredLanguage();
        return LOCALE_TO_LANGUAGE_MAP[locale] || 'english';
    }
}
