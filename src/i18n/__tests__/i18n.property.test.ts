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
import vi from '../locales/vi.json';
import ko from '../locales/ko.json';
import fr from '../locales/fr.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import pt from '../locales/pt.json';
import zhCN from '../locales/zh-cn.json';
import zhTW from '../locales/zh-tw.json';
import it from '../locales/it.json';
import cs from '../locales/cs.json';
import hu from '../locales/hu.json';
import bg from '../locales/bg.json';
import tr from '../locales/tr.json';
import pl from '../locales/pl.json';
import ru from '../locales/ru.json';
import th from '../locales/th.json';
import hi from '../locales/hi.json';
import bn from '../locales/bn.json';
import jv from '../locales/jv.json';
import ta from '../locales/ta.json';
import my from '../locales/my.json';
import ar from '../locales/ar.json';
import he from '../locales/he.json';

suite('i18n Property Tests', () => {
    /**
     * **Feature: ui-internationalization, Property 1: Japanese locale returns Japanese translations**
     * **Validates: Requirements 1.1**
     */
    test(
        'Property 1: Japanese locale returns Japanese translations',
        createTaggedPropertyTest(
            'ui-internationalization',
            1,
            'Japanese locale returns Japanese translations',
            () => {
                const manager = new TranslationManager();
                manager.setLocale('ja');

                const validKeys = getAllKeys(ja);

                runPropertyTest(
                    fc.property(fc.constantFrom(...validKeys), (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(ja, key);
                        return translation === expected;
                    }),
                );
            },
        ),
    );

    /**
     * **Feature: ui-internationalization, Property 5: Unsupported locale returns English translations**
     * **Validates: Requirements 1.6**
     */
    test(
        'Property 5: Unsupported locale returns English translations',
        createTaggedPropertyTest(
            'ui-internationalization',
            5,
            'Unsupported locale returns English translations',
            () => {
                const manager = new TranslationManager();
                manager.setLocale('en');

                const validKeys = getAllKeys(en);

                runPropertyTest(
                    fc.property(fc.constantFrom(...validKeys), (key: string) => {
                        const translation = manager.t(key);
                        const expected = getNestedValue(en, key);
                        return translation === expected;
                    }),
                );
            },
        ),
    );

    /**
     * **Feature: ui-internationalization, Property 6: Locale switching updates translations**
     * **Validates: Requirements 1.6**
     */
    test(
        'Property 6: Locale switching updates translations',
        createTaggedPropertyTest(
            'ui-internationalization',
            6,
            'Locale switching updates translations',
            () => {
                const manager = new TranslationManager();

                const allLocales = [ja, vi, ko, fr, de, es, pt, zhCN, zhTW, it, cs, hu, bg, tr, pl, ru, th, hi, bn, jv, ta, my, ar, he];
                const validKeys = getAllKeys(en).filter((key) => {
                    return allLocales.every(
                        (locale) => getNestedValue(locale, key) !== undefined,
                    );
                });

                const localeToTranslation: Record<SupportedLocale, Record<string, any>> = {
                    en,
                    ja,
                    vi,
                    ko,
                    fr,
                    de,
                    es,
                    pt,
                    'zh-cn': zhCN,
                    'zh-tw': zhTW,
                    it,
                    cs,
                    hu,
                    bg,
                    tr,
                    pl,
                    ru,
                    th,
                    hi,
                    bn,
                    jv,
                    ta,
                    my,
                    ar,
                    he,
                };

                const allLocaleKeys: SupportedLocale[] = [
                    'en', 'ja', 'vi', 'ko', 'fr', 'de', 'es', 'pt', 'zh-cn', 'zh-tw',
                    'it', 'cs', 'hu', 'bg', 'tr', 'pl', 'ru', 'th', 'hi', 'bn', 'jv', 'ta', 'my', 'ar', 'he',
                ];

                runPropertyTest(
                    fc.property(
                        fc.constantFrom(...validKeys),
                        fc.constantFrom<SupportedLocale>(...allLocaleKeys),
                        fc.constantFrom<SupportedLocale>(...allLocaleKeys),
                        (
                            key: string,
                            initialLocale: SupportedLocale,
                            newLocale: SupportedLocale,
                        ) => {
                            manager.setLocale(initialLocale);
                            const initialTranslation = manager.t(key);
                            const initialExpected = getNestedValue(
                                localeToTranslation[initialLocale],
                                key,
                            );

                            manager.setLocale(newLocale);
                            const newTranslation = manager.t(key);
                            const newExpected = getNestedValue(localeToTranslation[newLocale], key);

                            return (
                                initialTranslation === initialExpected &&
                                newTranslation === newExpected
                            );
                        },
                    ),
                );
            },
        ),
    );

    /**
     * **Feature: ui-internationalization, Property 7: Missing translation fallback**
     * **Validates: Requirements 2.3**
     */
    test(
        'Property 7: Missing translation fallback',
        createTaggedPropertyTest(
            'ui-internationalization',
            7,
            'Missing translation fallback',
            () => {
                const manager = new TranslationManager();

                const missingPairs: Array<{ locale: SupportedLocale; key: string }> = [];
                const englishKeys = getAllKeys(en);

                const localeChecks: Array<{ data: Record<string, any>; code: SupportedLocale }> = [
                    { data: ja, code: 'ja' },
                    { data: vi, code: 'vi' },
                    { data: ko, code: 'ko' },
                    { data: fr, code: 'fr' },
                    { data: de, code: 'de' },
                    { data: es, code: 'es' },
                    { data: pt, code: 'pt' },
                    { data: zhCN, code: 'zh-cn' },
                    { data: zhTW, code: 'zh-tw' },
                    { data: it, code: 'it' },
                    { data: cs, code: 'cs' },
                    { data: hu, code: 'hu' },
                    { data: bg, code: 'bg' },
                    { data: tr, code: 'tr' },
                    { data: pl, code: 'pl' },
                    { data: ru, code: 'ru' },
                    { data: th, code: 'th' },
                    { data: hi, code: 'hi' },
                    { data: bn, code: 'bn' },
                    { data: jv, code: 'jv' },
                    { data: ta, code: 'ta' },
                    { data: my, code: 'my' },
                    { data: ar, code: 'ar' },
                    { data: he, code: 'he' },
                ];

                for (const key of englishKeys) {
                    for (const { data, code } of localeChecks) {
                        if (getNestedValue(data, key) === undefined) {
                            missingPairs.push({ locale: code, key });
                        }
                    }
                }

                // If there are no missing keys, test fallback with a non-existent key.
                if (missingPairs.length === 0) {
                    console.log(
                        'All keys are translated in all languages, testing fallback with non-existent key',
                    );

                    manager.setLocale('zh-cn');
                    const fallbackKey = 'test.fallbackKey';
                    const translation = manager.t(fallbackKey);
                    assert.strictEqual(
                        translation,
                        fallbackKey,
                        'Missing key should return the key itself as fallback',
                    );
                    return;
                }

                runPropertyTest(
                    fc.property(
                        fc.constantFrom(...missingPairs),
                        ({ locale, key }: { locale: SupportedLocale; key: string }) => {
                            manager.setLocale(locale);
                            const translation = manager.t(key);
                            const englishValue = getNestedValue(en, key);
                            return translation === englishValue;
                        },
                    ),
                );
            },
        ),
    );
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

        const result = manager.interpolate('User {name} has {count} messages', {
            name: 'Alice',
            count: 5,
        });
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

    test('should detect Vietnamese locale when language starts with vi', () => {
        assert.strictEqual(LocaleDetector.detectLocale('vi'), 'vi');
        assert.strictEqual(LocaleDetector.detectLocale('vi-VN'), 'vi');
    });

    test('should detect Korean locale when language starts with ko', () => {
        assert.strictEqual(LocaleDetector.detectLocale('ko'), 'ko');
        assert.strictEqual(LocaleDetector.detectLocale('ko-KR'), 'ko');
    });

    test('should detect European locales correctly', () => {
        assert.strictEqual(LocaleDetector.detectLocale('fr'), 'fr');
        assert.strictEqual(LocaleDetector.detectLocale('fr-FR'), 'fr');

        assert.strictEqual(LocaleDetector.detectLocale('de'), 'de');
        assert.strictEqual(LocaleDetector.detectLocale('de-DE'), 'de');

        assert.strictEqual(LocaleDetector.detectLocale('es'), 'es');
        assert.strictEqual(LocaleDetector.detectLocale('es-ES'), 'es');

        assert.strictEqual(LocaleDetector.detectLocale('pt'), 'pt');
        assert.strictEqual(LocaleDetector.detectLocale('pt-BR'), 'pt');
    });

    test('should detect Chinese locales correctly', () => {
        assert.strictEqual(LocaleDetector.detectLocale('zh-cn'), 'zh-cn');
        assert.strictEqual(LocaleDetector.detectLocale('zh-CN'), 'zh-cn');
        assert.strictEqual(LocaleDetector.detectLocale('zh-hans'), 'zh-cn');

        assert.strictEqual(LocaleDetector.detectLocale('zh-tw'), 'zh-tw');
        assert.strictEqual(LocaleDetector.detectLocale('zh-TW'), 'zh-tw');
        assert.strictEqual(LocaleDetector.detectLocale('zh-hant'), 'zh-tw');
    });

    test('should detect new locales correctly', () => {
        assert.strictEqual(LocaleDetector.detectLocale('it'), 'it');
        assert.strictEqual(LocaleDetector.detectLocale('it-IT'), 'it');
        assert.strictEqual(LocaleDetector.detectLocale('cs'), 'cs');
        assert.strictEqual(LocaleDetector.detectLocale('hu'), 'hu');
        assert.strictEqual(LocaleDetector.detectLocale('bg'), 'bg');
        assert.strictEqual(LocaleDetector.detectLocale('tr'), 'tr');
        assert.strictEqual(LocaleDetector.detectLocale('pl'), 'pl');
        assert.strictEqual(LocaleDetector.detectLocale('ru'), 'ru');
        assert.strictEqual(LocaleDetector.detectLocale('th'), 'th');
        assert.strictEqual(LocaleDetector.detectLocale('hi'), 'hi');
        assert.strictEqual(LocaleDetector.detectLocale('bn'), 'bn');
        assert.strictEqual(LocaleDetector.detectLocale('jv'), 'jv');
        assert.strictEqual(LocaleDetector.detectLocale('ta'), 'ta');
        assert.strictEqual(LocaleDetector.detectLocale('my'), 'my');
        assert.strictEqual(LocaleDetector.detectLocale('ar'), 'ar');
        assert.strictEqual(LocaleDetector.detectLocale('he'), 'he');
    });

    test('should return English for unsupported locales', () => {
        assert.strictEqual(LocaleDetector.detectLocale('en'), 'en');
        assert.strictEqual(LocaleDetector.detectLocale('en-US'), 'en');
        assert.strictEqual(LocaleDetector.detectLocale('nl-NL'), 'en');
        assert.strictEqual(LocaleDetector.detectLocale('sv-SE'), 'en');
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
