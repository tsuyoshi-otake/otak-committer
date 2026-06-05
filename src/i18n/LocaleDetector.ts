/**
 * LocaleDetector - Detects the current VS Code display language
 *
 * Resolves a BCP-47 language tag (e.g. `ja`, `ja-JP`, `zh-Hant-HK`) down to a
 * `SupportedLocale` via the prefix table in `supportedLocales.ts`. Unknown tags
 * fall back to `en`.
 *
 * @example
 * ```typescript
 * const locale = LocaleDetector.getLocale(); // 'ja' | 'en' | ...
 * ```
 */

import { LOCALE_PREFIX_MATCHERS, SupportedLocale } from './supportedLocales';

export type { SupportedLocale } from './supportedLocales';

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
     * Detect locale from a BCP-47 language tag.
     *
     * Linear search over `LOCALE_PREFIX_MATCHERS`: the first prefix whose
     * lowercase form matches the input wins. Registry ordering guarantees that
     * specific variants (e.g. `zh-tw`) are tried before generic ones (`zh`).
     *
     * @param language - The language code to detect (e.g., 'ja', 'ja-JP', 'en-US')
     * @returns Supported locale code, or `'en'` if no prefix matches.
     */
    static detectLocale(language: string | undefined): SupportedLocale {
        if (!language) {
            return 'en';
        }

        const lowerLang = language.toLowerCase();
        const match = LOCALE_PREFIX_MATCHERS.find(([prefix]) => lowerLang.startsWith(prefix));
        return match ? match[1] : 'en';
    }
}
