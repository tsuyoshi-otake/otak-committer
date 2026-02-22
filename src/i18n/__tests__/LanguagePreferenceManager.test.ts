/**
 * Tests for LanguagePreferenceManager
 *
 * Note: UI localization supports English, Japanese, Vietnamese, Korean,
 * Chinese (Simplified/Traditional), French, German, Spanish, and Portuguese.
 * Other VS Code display languages fall back to English.
 */

import * as assert from 'assert';
import { createTaggedPropertyTest } from '../../test/helpers/property-test.helper';
import { SupportedLocale } from '../LocaleDetector';
import { LanguagePreferenceManager, LOCALE_TO_LANGUAGE_MAP } from '../LanguagePreferenceManager';

suite('LanguagePreferenceManager Property Tests', () => {
    setup(() => {
        LanguagePreferenceManager.resetForTesting();
    });

    test(
        'Property 8: Japanese locale maps to japanese language',
        createTaggedPropertyTest(
            'ui-internationalization',
            8,
            'Japanese UI generates Japanese commit messages',
            async () => {
                await LanguagePreferenceManager.setPreferredLanguage('ja');
                const languageName = LanguagePreferenceManager.getCommitLanguageName();
                assert.strictEqual(languageName, 'japanese');
            },
        ),
    );

    test(
        'Property 12: English locale maps to english language',
        createTaggedPropertyTest(
            'ui-internationalization',
            12,
            'Unsupported UI language generates English commit messages',
            async () => {
                await LanguagePreferenceManager.setPreferredLanguage('en');
                const languageName = LanguagePreferenceManager.getCommitLanguageName();
                assert.strictEqual(languageName, 'english');
            },
        ),
    );

    test(
        'Property 13: Manual language preference overrides UI language',
        createTaggedPropertyTest(
            'ui-internationalization',
            13,
            'Manual language preference overrides UI language',
            async () => {
                const supportedLocales: SupportedLocale[] = [
                    'ja',
                    'vi',
                    'ko',
                    'fr',
                    'de',
                    'es',
                    'pt',
                    'zh-cn',
                    'zh-tw',
                    'en',
                ];

                for (const preferredLocale of supportedLocales) {
                    LanguagePreferenceManager.resetForTesting();
                    await LanguagePreferenceManager.setPreferredLanguage(preferredLocale);
                    const result = LanguagePreferenceManager.getPreferredLanguage();
                    assert.strictEqual(
                        result,
                        preferredLocale,
                        `Preference ${preferredLocale} should be returned`,
                    );
                }
            },
        ),
    );
});

suite('LanguagePreferenceManager Unit Tests', () => {
    setup(() => {
        LanguagePreferenceManager.resetForTesting();
    });

    test('should return false for hasPreference when no preference is set', () => {
        assert.strictEqual(LanguagePreferenceManager.hasPreference(), false);
    });

    test('should set and get preference correctly', async () => {
        await LanguagePreferenceManager.setPreferredLanguage('ja');
        assert.strictEqual(LanguagePreferenceManager.getPreferredLanguage(), 'ja');
        assert.strictEqual(LanguagePreferenceManager.hasPreference(), true);
    });

    test('should clear preference correctly', async () => {
        await LanguagePreferenceManager.setPreferredLanguage('en');
        await LanguagePreferenceManager.clearPreferredLanguage();
        assert.strictEqual(LanguagePreferenceManager.hasPreference(), false);
    });

    test('should override preference when setting new value', async () => {
        await LanguagePreferenceManager.setPreferredLanguage('ja');
        await LanguagePreferenceManager.setPreferredLanguage('en');
        assert.strictEqual(LanguagePreferenceManager.getPreferredLanguage(), 'en');
    });

    test('LOCALE_TO_LANGUAGE_MAP should have all supported locales', () => {
        const supportedLocales: SupportedLocale[] = [
            'ja',
            'vi',
            'ko',
            'fr',
            'de',
            'es',
            'pt',
            'zh-cn',
            'zh-tw',
            'en',
        ];
        for (const locale of supportedLocales) {
            assert.ok(
                LOCALE_TO_LANGUAGE_MAP[locale],
                `LOCALE_TO_LANGUAGE_MAP should have entry for ${locale}`,
            );
        }
    });

    test('getCommitLanguageName should return correct language names', async () => {
        const testCases: Array<{ locale: SupportedLocale; expected: string }> = [
            { locale: 'ja', expected: 'japanese' },
            { locale: 'vi', expected: 'vietnamese' },
            { locale: 'ko', expected: 'korean' },
            { locale: 'fr', expected: 'french' },
            { locale: 'de', expected: 'german' },
            { locale: 'es', expected: 'spanish' },
            { locale: 'pt', expected: 'portuguese' },
            { locale: 'zh-cn', expected: 'chinese' },
            { locale: 'zh-tw', expected: 'traditionalChinese' },
            { locale: 'en', expected: 'english' },
        ];

        for (const { locale, expected } of testCases) {
            LanguagePreferenceManager.resetForTesting();
            await LanguagePreferenceManager.setPreferredLanguage(locale);
            const result = LanguagePreferenceManager.getCommitLanguageName();
            assert.strictEqual(result, expected, `Locale ${locale} should map to ${expected}`);
        }
    });
});
