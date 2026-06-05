/**
 * Single source of truth for supported UI locales.
 *
 * Owns the `SupportedLocale` type and derives every locale-related lookup
 * table from a single `LOCALES` registry. Adding a language means appending
 * one entry here; no other file in the i18n stack needs editing.
 */

export type SupportedLocale =
    | 'ja'
    | 'vi'
    | 'ko'
    | 'fr'
    | 'de'
    | 'es'
    | 'pt'
    | 'zh-cn'
    | 'zh-tw'
    | 'it'
    | 'cs'
    | 'hu'
    | 'bg'
    | 'tr'
    | 'pl'
    | 'ru'
    | 'th'
    | 'hi'
    | 'bn'
    | 'jv'
    | 'ta'
    | 'my'
    | 'ar'
    | 'he'
    | 'en';

interface LocaleSpec {
    /** Canonical locale code stored in configuration and used by translations. */
    readonly locale: SupportedLocale;
    /** Language name used by `src/languages/` (matches `SupportedLanguage` enum values). */
    readonly languageName: string;
    /**
     * BCP-47 lowercase prefixes that resolve to this locale.
     * Iteration order in `LOCALES` is preserved by `LOCALE_PREFIX_MATCHERS`,
     * so more-specific entries (e.g. `zh-tw`) must appear before generic
     * fall-throughs (e.g. `zh` -> `zh-cn`).
     */
    readonly prefixes: readonly string[];
}

const LOCALES: readonly LocaleSpec[] = [
    // Chinese variants - specific traditional-Chinese prefixes must precede generic 'zh'.
    {
        locale: 'zh-tw',
        languageName: 'traditionalChinese',
        prefixes: ['zh-tw', 'zh-hant', 'zh-hk', 'zh-mo'],
    },
    { locale: 'zh-cn', languageName: 'chinese', prefixes: ['zh'] },

    { locale: 'ja', languageName: 'japanese', prefixes: ['ja'] },
    { locale: 'vi', languageName: 'vietnamese', prefixes: ['vi'] },
    { locale: 'ko', languageName: 'korean', prefixes: ['ko'] },
    { locale: 'fr', languageName: 'french', prefixes: ['fr'] },
    { locale: 'de', languageName: 'german', prefixes: ['de'] },
    { locale: 'es', languageName: 'spanish', prefixes: ['es'] },
    { locale: 'pt', languageName: 'portuguese', prefixes: ['pt'] },
    { locale: 'it', languageName: 'italian', prefixes: ['it'] },
    { locale: 'cs', languageName: 'czech', prefixes: ['cs'] },
    { locale: 'hu', languageName: 'hungarian', prefixes: ['hu'] },
    { locale: 'bg', languageName: 'bulgarian', prefixes: ['bg'] },
    { locale: 'tr', languageName: 'turkish', prefixes: ['tr'] },
    { locale: 'pl', languageName: 'polish', prefixes: ['pl'] },
    { locale: 'ru', languageName: 'russian', prefixes: ['ru'] },
    { locale: 'th', languageName: 'thai', prefixes: ['th'] },
    { locale: 'hi', languageName: 'hindi', prefixes: ['hi'] },
    { locale: 'bn', languageName: 'bengali', prefixes: ['bn'] },
    { locale: 'jv', languageName: 'javanese', prefixes: ['jv'] },
    { locale: 'ta', languageName: 'tamil', prefixes: ['ta'] },
    { locale: 'my', languageName: 'burmese', prefixes: ['my'] },
    { locale: 'ar', languageName: 'arabic', prefixes: ['ar'] },
    { locale: 'he', languageName: 'hebrew', prefixes: ['he'] },
    { locale: 'en', languageName: 'english', prefixes: ['en'] },
];

/**
 * Ordered [prefix, locale] pairs used by `LocaleDetector.detectLocale`.
 * Linear search returns the first matching prefix, so registry ordering matters
 * (zh-* specific variants precede the generic `zh -> zh-cn` fallback).
 */
export const LOCALE_PREFIX_MATCHERS: ReadonlyArray<readonly [prefix: string, locale: SupportedLocale]> =
    LOCALES.flatMap((spec) => spec.prefixes.map((prefix) => [prefix, spec.locale] as const));

/** Locale -> commit-language name (consumed by LanguagePreferenceManager). */
export const LOCALE_TO_LANGUAGE_MAP: Record<SupportedLocale, string> = Object.fromEntries(
    LOCALES.map((spec) => [spec.locale, spec.languageName]),
) as Record<SupportedLocale, string>;

/** Language name -> locale (consumed by ConfigCommand.changeLanguage). */
export const LANGUAGE_NAME_TO_LOCALE: Readonly<Record<string, SupportedLocale>> = Object.fromEntries(
    LOCALES.map((spec) => [spec.languageName, spec.locale]),
);

/** Frozen list of every supported locale. */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = LOCALES.map((spec) => spec.locale);

/** Type guard that narrows an arbitrary string to `SupportedLocale`. */
export function isSupportedLocale(value: string): value is SupportedLocale {
    return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
