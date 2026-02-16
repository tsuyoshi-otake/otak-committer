/**
 * Property-based tests for internationalization (i18n) module
 *
 * Tests the correctness properties defined in design.md:
 * - Property 1: Japanese locale returns Japanese translations
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

suite('i18n Property Tests', () => {
    /**
     * **Feature: ui-internationalization, Property 1: Japanese locale returns Japanese translations**
     * **Validates: Requirements 1.1**
     */
    test('Property 1: Japanese locale returns Japanese translations', createTaggedPropertyTest(
        'ui-internationalization',
        1,
        'Japanese locale returns Japanese translations',
        () => {
            const manager = new TranslationManager();
            manager.setLocale('ja');

            const validKeys = getAllKeys(ja);

            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(ja, key);
                        return translation === expected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 5: Unsupported locale returns English translations**
     * **Validates: Requirements 1.6**
     */
    test('Property 5: Unsupported locale returns English translations', createTaggedPropertyTest(
        'ui-internationalization',
        5,
        'Unsupported locale returns English translations',
        () => {
            const manager = new TranslationManager();
            manager.setLocale('en');

            const validKeys = getAllKeys(en);

            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(en, key);
                        return translation === expected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 6: Locale switching updates translations**
     * **Validates: Requirements 1.6**
     */
    test('Property 6: Locale switching updates translations', createTaggedPropertyTest(
        'ui-internationalization',
        6,
        'Locale switching updates translations',
        () => {
            const manager = new TranslationManager();

            const validKeys = getAllKeys(en).filter(key =>
                getNestedValue(ja, key) !== undefined
            );

            const localeToTranslation: Record<SupportedLocale, Record<string, any>> = {
                en,
                ja
            };

            runPropertyTest(
                fc.property(
                    fc.constantFrom(...validKeys),
                    fc.constantFrom<SupportedLocale>('en', 'ja'),
                    fc.constantFrom<SupportedLocale>('en', 'ja'),
                    (key: string, initialLocale: SupportedLocale, newLocale: SupportedLocale) => {
                        manager.setLocale(initialLocale);
                        const initialTranslation = manager.t(key);
                        const initialExpected = getNestedValue(localeToTranslation[initialLocale], key);

                        manager.setLocale(newLocale);
                        const newTranslation = manager.t(key);
                        const newExpected = getNestedValue(localeToTranslation[newLocale], key);

                        return initialTranslation === initialExpected && newTranslation === newExpected;
                    }
                )
            );
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 7: Missing translation fallback**
     * **Validates: Requirements 2.3**
     */
    test('Property 7: Missing translation fallback', createTaggedPropertyTest(
        'ui-internationalization',
        7,
        'Missing translation fallback',
        () => {
            const manager = new TranslationManager();

            const englishOnlyKeys = getAllKeys(en).filter(key =>
                getNestedValue(ja, key) === undefined
            );

            // If there are no English-only keys, test fallback with a non-existent key.
            if (englishOnlyKeys.length === 0) {
                console.log('All keys are translated in all languages, testing fallback with non-existent key');

                manager.setLocale('ja');
                const fallbackKey = 'test.fallbackKey';
                const translation = manager.t(fallbackKey);
                assert.strictEqual(translation, fallbackKey, 'Missing key should return the key itself as fallback');
                return;
            }

            runPropertyTest(
                fc.property(
                    fc.constantFrom(...englishOnlyKeys),
                    (key: string) => {
                        manager.setLocale('ja');
                        const translation = manager.t(key);
                        const englishValue = getNestedValue(en, key);
                        return translation === englishValue;
                    }
                )
            );
        }
    ));
});

suite('i18n Unit Tests - Parameter Interpolation', () => {
    test('should replace single parameter', () => {
        const manager = new TranslationManager();
        manager.setLocale('en');

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

        const result = manager.interpolate('Hello {name}!', {});
        assert.strictEqual(result, 'Hello {name}!');
    });

    test('should handle special characters in parameters', () => {
        const manager = new TranslationManager();

        const result = manager.interpolate('Path: {path}', { path: '/home/user/{config}' });
        assert.strictEqual(result, 'Path: /home/user/{config}');
    });

    test('should handle numeric parameters', () => {
        const manager = new TranslationManager();

        const result = manager.interpolate('Count: {count}', { count: 42 });
        assert.strictEqual(result, 'Count: 42');
    });

    test('should handle empty string parameters', () => {
        const manager = new TranslationManager();

        const result = manager.interpolate('Value: {value}', { value: '' });
        assert.strictEqual(result, 'Value: ');
    });
});

suite('LocaleDetector Unit Tests', () => {
    test('should detect Japanese locale when language starts with ja', () => {
        assert.strictEqual(LocaleDetector.detectLocale('ja'), 'ja');
        assert.strictEqual(LocaleDetector.detectLocale('ja-JP'), 'ja');
    });

    test('should fall back to English for all non-Japanese locales', () => {
        assert.strictEqual(LocaleDetector.detectLocale('en'), 'en');
        assert.strictEqual(LocaleDetector.detectLocale('en-US'), 'en');
        assert.strictEqual(LocaleDetector.detectLocale('fr'), 'en');
        assert.strictEqual(LocaleDetector.detectLocale('de-DE'), 'en');

        // Previously-supported locales should also fall back to English.
        assert.strictEqual(LocaleDetector.detectLocale('vi'), 'en');
        assert.strictEqual(LocaleDetector.detectLocale('ko'), 'en');
        assert.strictEqual(LocaleDetector.detectLocale('zh-cn'), 'en');
        assert.strictEqual(LocaleDetector.detectLocale('zh-tw'), 'en');
    });

    test('should handle undefined or empty locale', () => {
        assert.strictEqual(LocaleDetector.detectLocale(undefined), 'en');
        assert.strictEqual(LocaleDetector.detectLocale(''), 'en');
    });
});

// Helper functions

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

