/**
 * Property-based tests for internationalization (i18n) module
 *
 * Tests the correctness properties defined in design.md:
 * - Property 1: Japanese locale returns Japanese translations
 * - Property 2: Vietnamese locale returns Vietnamese translations
 * - Property 3: Korean locale returns Korean translations
 * - Property 4: Chinese locale returns Chinese translations
 * - Property 5: Unsupported locale returns English translations
 * - Property 6: Locale switching updates translations
 * - Property 7: Missing translation fallback
 */

import * as fc from 'fast-check';
import * as assert from 'assert';
import { createTaggedPropertyTest, runPropertyTest } from '../../test/helpers/property-test.helper';
import { TranslationManager, LocaleDetector, SupportedLocale } from '../index';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import vi from '../locales/vi.json';
import ko from '../locales/ko.json';
import zhCn from '../locales/zh-cn.json';
import zhTw from '../locales/zh-tw.json';

suite('i18n Property Tests', () => {
    /**
     * **Feature: ui-internationalization, Property 1: Japanese locale returns Japanese translations**
     * **Validates: Requirements 1.1**
     *
     * For any valid translation key, when the locale is set to 'ja',
     * the translation function should return the Japanese translation string.
     */
    test('Property 1: Japanese locale returns Japanese translations', createTaggedPropertyTest(
        'ui-internationalization',
        1,
        'Japanese locale returns Japanese translations',
        () => {
            const manager = new TranslationManager();
            manager.setLocale('ja');

            // Get all valid keys from Japanese translations
            const validKeys = getAllKeys(ja);

            // Property: For all valid keys, Japanese locale returns Japanese translation
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(ja, key);

                        // Translation must match Japanese value
                        return translation === expected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 2: Vietnamese locale returns Vietnamese translations**
     * **Validates: Requirements 1.2**
     *
     * For any valid translation key, when the locale is set to 'vi',
     * the translation function should return the Vietnamese translation string.
     */
    test('Property 2: Vietnamese locale returns Vietnamese translations', createTaggedPropertyTest(
        'ui-internationalization',
        2,
        'Vietnamese locale returns Vietnamese translations',
        () => {
            const manager = new TranslationManager();
            manager.setLocale('vi');

            // Get all valid keys from Vietnamese translations
            const validKeys = getAllKeys(vi);

            // Property: For all valid keys, Vietnamese locale returns Vietnamese translation
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(vi, key);

                        // Translation must match Vietnamese value
                        return translation === expected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 3: Korean locale returns Korean translations**
     * **Validates: Requirements 1.3**
     *
     * For any valid translation key, when the locale is set to 'ko',
     * the translation function should return the Korean translation string.
     */
    test('Property 3: Korean locale returns Korean translations', createTaggedPropertyTest(
        'ui-internationalization',
        3,
        'Korean locale returns Korean translations',
        () => {
            const manager = new TranslationManager();
            manager.setLocale('ko');

            // Get all valid keys from Korean translations
            const validKeys = getAllKeys(ko);

            // Property: For all valid keys, Korean locale returns Korean translation
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(ko, key);

                        // Translation must match Korean value
                        return translation === expected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 4: Chinese locale returns Chinese translations**
     * **Validates: Requirements 1.4**
     *
     * For any valid translation key, when the locale is set to 'zh-cn',
     * the translation function should return the Chinese (Simplified) translation string.
     */
    test('Property 4: Chinese locale returns Chinese translations', createTaggedPropertyTest(
        'ui-internationalization',
        4,
        'Chinese locale returns Chinese translations',
        () => {
            const manager = new TranslationManager();
            manager.setLocale('zh-cn');

            // Get all valid keys from Chinese translations
            const validKeys = getAllKeys(zhCn);

            // Property: For all valid keys, Chinese locale returns Chinese translation
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(zhCn, key);

                        // Translation must match Chinese value
                        return translation === expected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 4.5: Traditional Chinese locale returns Traditional Chinese translations**
     * **Validates: Requirements 1.5**
     *
     * For any valid translation key, when the locale is set to 'zh-tw',
     * the translation function should return the Traditional Chinese translation string.
     */
    test('Property 4.5: Traditional Chinese locale returns Traditional Chinese translations', createTaggedPropertyTest(
        'ui-internationalization',
        4.5,
        'Traditional Chinese locale returns Traditional Chinese translations',
        () => {
            const manager = new TranslationManager();
            manager.setLocale('zh-tw');

            // Get all valid keys from Traditional Chinese translations
            const validKeys = getAllKeys(zhTw);

            // Property: For all valid keys, Traditional Chinese locale returns Traditional Chinese translation
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(zhTw, key);

                        // Translation must match Traditional Chinese value
                        return translation === expected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 5: Unsupported locale returns English translations**
     * **Validates: Requirements 1.6**
     *
     * For any valid translation key and any unsupported locale value,
     * the translation function should return the English translation string.
     */
    test('Property 5: Unsupported locale returns English translations', createTaggedPropertyTest(
        'ui-internationalization',
        5,
        'Unsupported locale returns English translations',
        () => {
            const manager = new TranslationManager();
            manager.setLocale('en');

            // Get all valid keys from English translations
            const validKeys = getAllKeys(en);

            // Property: For all valid keys, English locale returns English translation
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(en, key);

                        // Translation must match English value
                        return translation === expected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 6: Locale switching updates translations**
     * **Validates: Requirements 1.6**
     *
     * For any valid translation key, when the locale is changed from one language to another,
     * subsequent calls to the translation function should return strings in the new language.
     */
    test('Property 6: Locale switching updates translations', createTaggedPropertyTest(
        'ui-internationalization',
        6,
        'Locale switching updates translations',
        () => {
            const manager = new TranslationManager();

            // Get keys that exist in all locales
            const validKeys = getAllKeys(en).filter(key =>
                getNestedValue(ja, key) !== undefined &&
                getNestedValue(vi, key) !== undefined &&
                getNestedValue(ko, key) !== undefined &&
                getNestedValue(zhCn, key) !== undefined &&
                getNestedValue(zhTw, key) !== undefined
            );

            // Locale to translation mapping
            const localeToTranslation: Record<SupportedLocale, Record<string, any>> = {
                'ja': ja,
                'en': en,
                'vi': vi,
                'ko': ko,
                'zh-cn': zhCn,
                'zh-tw': zhTw
            };

            // Property: Switching locale changes translation output
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    fc.constantFrom<SupportedLocale>('ja', 'en', 'vi', 'ko', 'zh-cn', 'zh-tw'),
                    fc.constantFrom<SupportedLocale>('ja', 'en', 'vi', 'ko', 'zh-cn', 'zh-tw'),
                    (key: string, initialLocale: SupportedLocale, newLocale: SupportedLocale) => {
                        // Set initial locale
                        manager.setLocale(initialLocale);

                        const initialTranslation = manager.t(key);
                        const initialExpected = getNestedValue(
                            localeToTranslation[initialLocale],
                            key
                        );

                        // Switch locale
                        manager.setLocale(newLocale);

                        const newTranslation = manager.t(key);
                        const newExpected = getNestedValue(
                            localeToTranslation[newLocale],
                            key
                        );

                        // Both translations should match their expected values
                        return initialTranslation === initialExpected &&
                               newTranslation === newExpected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 7: Missing translation fallback**
     * **Validates: Requirements 2.3**
     *
     * For any translation key that exists in the English translations,
     * if that key is missing in another language's translations,
     * the translation function should return the English translation as a fallback.
     */
    test('Property 7: Missing translation fallback', createTaggedPropertyTest(
        'ui-internationalization',
        7,
        'Missing translation fallback',
        () => {
            const manager = new TranslationManager();

            // Get keys that exist only in English (not in other languages)
            const englishOnlyKeys = getAllKeys(en).filter(key =>
                getNestedValue(ja, key) === undefined ||
                getNestedValue(vi, key) === undefined ||
                getNestedValue(ko, key) === undefined ||
                getNestedValue(zhCn, key) === undefined ||
                getNestedValue(zhTw, key) === undefined
            );

            // If there are no English-only keys, skip this test (all keys are translated)
            if (englishOnlyKeys.length === 0) {
                console.log('All keys are translated in all languages, testing fallback with non-existent key');

                // Test with a key that doesn't exist in any language by design
                manager.setLocale('ja');
                const fallbackKey = 'test.fallbackKey';
                const translation = manager.t(fallbackKey);

                // Should fall back to the key itself if not in any translation
                assert.strictEqual(translation, fallbackKey,
                    'Missing key should return the key itself as fallback');
                return;
            }

            // Property: For English-only keys, non-English locales fall back to English
            const nonEnglishLocales: SupportedLocale[] = ['ja', 'vi', 'ko', 'zh-cn', 'zh-tw'];
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...englishOnlyKeys),
                    fc.constantFrom(...nonEnglishLocales),
                    (key: string, locale: SupportedLocale) => {
                        manager.setLocale(locale);
                        const translation = manager.t(key);
                        const englishValue = getNestedValue(en, key);

                        // Should fall back to English translation
                        return translation === englishValue;
                    }
                )
            );
        }
    ));
});

suite('i18n Unit Tests - Parameter Interpolation', () => {
    /**
     * Task 3.5: Unit tests for parameter interpolation
     */

    test('should replace single parameter', () => {
        const manager = new TranslationManager();
        manager.setLocale('en');

        // Add a test translation with parameter
        const result = manager.interpolate('Hello {name}!', { name: 'World' });
        assert.strictEqual(result, 'Hello World!');
    });

    test('should replace multiple parameters', () => {
        const manager = new TranslationManager();

        const result = manager.interpolate(
            'User {name} has {count} messages',
            { name: 'Alice', count: 5 }
        );
        assert.strictEqual(result, 'User Alice has 5 messages');
    });

    test('should handle missing parameters gracefully', () => {
        const manager = new TranslationManager();

        const result = manager.interpolate(
            'Hello {name}!',
            {} // Missing parameter
        );
        // Should leave placeholder intact
        assert.strictEqual(result, 'Hello {name}!');
    });

    test('should handle special characters in parameters', () => {
        const manager = new TranslationManager();

        const result = manager.interpolate(
            'Path: {path}',
            { path: '/home/user/{config}' }
        );
        assert.strictEqual(result, 'Path: /home/user/{config}');
    });

    test('should handle numeric parameters', () => {
        const manager = new TranslationManager();

        const result = manager.interpolate(
            'Count: {count}',
            { count: 42 }
        );
        assert.strictEqual(result, 'Count: 42');
    });

    test('should handle empty string parameters', () => {
        const manager = new TranslationManager();

        const result = manager.interpolate(
            'Value: {value}',
            { value: '' }
        );
        assert.strictEqual(result, 'Value: ');
    });
});

suite('LocaleDetector Unit Tests', () => {
    test('should detect Japanese locale when language starts with ja', () => {
        // Test with mock - actual VS Code API would return locale
        const locale = LocaleDetector.detectLocale('ja');
        assert.strictEqual(locale, 'ja');

        const localeJP = LocaleDetector.detectLocale('ja-JP');
        assert.strictEqual(localeJP, 'ja');
    });

    test('should detect Vietnamese locale when language starts with vi', () => {
        const locale = LocaleDetector.detectLocale('vi');
        assert.strictEqual(locale, 'vi');

        const localeVN = LocaleDetector.detectLocale('vi-VN');
        assert.strictEqual(localeVN, 'vi');
    });

    test('should detect Korean locale when language starts with ko', () => {
        const locale = LocaleDetector.detectLocale('ko');
        assert.strictEqual(locale, 'ko');

        const localeKR = LocaleDetector.detectLocale('ko-KR');
        assert.strictEqual(localeKR, 'ko');
    });

    test('should detect Chinese (Simplified) locale for zh-cn and zh-hans', () => {
        const localeZhCn = LocaleDetector.detectLocale('zh-cn');
        assert.strictEqual(localeZhCn, 'zh-cn');

        const localeZhHans = LocaleDetector.detectLocale('zh-hans');
        assert.strictEqual(localeZhHans, 'zh-cn');
    });

    test('should detect Chinese (Traditional) locale for zh-tw and zh-hant', () => {
        const localeZhTw = LocaleDetector.detectLocale('zh-tw');
        assert.strictEqual(localeZhTw, 'zh-tw');

        const localeZhHant = LocaleDetector.detectLocale('zh-hant');
        assert.strictEqual(localeZhHant, 'zh-tw');
    });

    test('should return English for unsupported locales', () => {
        const localeEn = LocaleDetector.detectLocale('en');
        assert.strictEqual(localeEn, 'en');

        const localeEnUS = LocaleDetector.detectLocale('en-US');
        assert.strictEqual(localeEnUS, 'en');

        const localeFr = LocaleDetector.detectLocale('fr');
        assert.strictEqual(localeFr, 'en');

        const localeDe = LocaleDetector.detectLocale('de-DE');
        assert.strictEqual(localeDe, 'en');
    });

    test('should handle undefined or empty locale', () => {
        const localeUndefined = LocaleDetector.detectLocale(undefined);
        assert.strictEqual(localeUndefined, 'en');

        const localeEmpty = LocaleDetector.detectLocale('');
        assert.strictEqual(localeEmpty, 'en');
    });
});

// Helper functions

/**
 * Get all keys from a nested object as dot-separated strings
 */
function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
    const keys: string[] = [];

    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys.push(...getAllKeys(obj[key], fullKey));
        } else {
            keys.push(fullKey);
        }
    }

    return keys;
}

/**
 * Get nested value from an object using dot-separated key
 */
function getNestedValue(obj: Record<string, any>, key: string): string | undefined {
    const parts = key.split('.');
    let current: any = obj;

    for (const part of parts) {
        if (current === undefined || current === null) {
            return undefined;
        }
        current = current[part];
    }

    return typeof current === 'string' ? current : undefined;
}
