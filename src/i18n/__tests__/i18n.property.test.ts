/**
 * Property-based tests for internationalization (i18n) module
 *
 * Tests the correctness properties defined in design.md:
 * - Property 1: Japanese locale returns Japanese translations
 * - Property 2: Non-Japanese locale returns English translations
 * - Property 3: Locale switching updates translations
 * - Property 4: Missing translation fallback
 */

import * as fc from 'fast-check';
import * as assert from 'assert';
import { createTaggedPropertyTest, runPropertyTest } from '../../test/helpers/property-test.helper';
import { TranslationManager, LocaleDetector, Locale } from '../index';
import en from '../locales/en.json';
import ja from '../locales/ja.json';

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
     * **Feature: ui-internationalization, Property 2: Non-Japanese locale returns English translations**
     * **Validates: Requirements 1.2**
     *
     * For any valid translation key and any non-Japanese locale value,
     * the translation function should return the English translation string.
     */
    test('Property 2: Non-Japanese locale returns English translations', createTaggedPropertyTest(
        'ui-internationalization',
        2,
        'Non-Japanese locale returns English translations',
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
     * **Feature: ui-internationalization, Property 3: Locale switching updates translations**
     * **Validates: Requirements 1.3**
     *
     * For any valid translation key, when the locale is changed from one language to another,
     * subsequent calls to the translation function should return strings in the new language.
     */
    test('Property 3: Locale switching updates translations', createTaggedPropertyTest(
        'ui-internationalization',
        3,
        'Locale switching updates translations',
        () => {
            const manager = new TranslationManager();

            // Get keys that exist in both locales
            const validKeys = getAllKeys(en).filter(key =>
                getNestedValue(ja, key) !== undefined
            );

            // Property: Switching locale changes translation output
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    fc.constantFrom<Locale>('ja', 'en'),
                    (key: string, newLocale: Locale) => {
                        // Set to opposite locale first
                        const initialLocale: Locale = newLocale === 'ja' ? 'en' : 'ja';
                        manager.setLocale(initialLocale);

                        const initialTranslation = manager.t(key);
                        const initialExpected = getNestedValue(
                            initialLocale === 'ja' ? ja : en,
                            key
                        );

                        // Switch locale
                        manager.setLocale(newLocale);

                        const newTranslation = manager.t(key);
                        const newExpected = getNestedValue(
                            newLocale === 'ja' ? ja : en,
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
     * **Feature: ui-internationalization, Property 4: Missing translation fallback**
     * **Validates: Requirements 2.3**
     *
     * For any translation key that exists in the English translations,
     * if that key is missing in another language's translations,
     * the translation function should return the English translation as a fallback.
     */
    test('Property 4: Missing translation fallback', createTaggedPropertyTest(
        'ui-internationalization',
        4,
        'Missing translation fallback',
        () => {
            const manager = new TranslationManager();

            // Get keys that exist only in English (not in Japanese)
            const englishOnlyKeys = getAllKeys(en).filter(key =>
                getNestedValue(ja, key) === undefined
            );

            // If there are no English-only keys, skip this test (all keys are translated)
            if (englishOnlyKeys.length === 0) {
                console.log('All keys are translated in both languages, testing fallback with non-existent key');

                // Test with a key that doesn't exist in Japanese by design
                manager.setLocale('ja');
                const fallbackKey = 'test.fallbackKey';
                const translation = manager.t(fallbackKey);

                // Should fall back to the key itself if not in any translation
                assert.strictEqual(translation, fallbackKey,
                    'Missing key should return the key itself as fallback');
                return;
            }

            // Property: For English-only keys, Japanese locale falls back to English
            runPropertyTest(
                fc.property(
                    fc.constantFrom(...englishOnlyKeys),
                    (key: string) => {
                        manager.setLocale('ja');
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

    test('should return English for non-Japanese locales', () => {
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
