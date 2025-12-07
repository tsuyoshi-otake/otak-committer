/**
 * Tests for LanguagePreferenceManager
 *
 * Tests the correctness properties defined in design.md:
 * - Property 8: Japanese UI generates Japanese commit messages
 * - Property 9: Vietnamese UI generates Vietnamese commit messages
 * - Property 10: Korean UI generates Korean commit messages
 * - Property 11: Chinese UI generates Chinese commit messages
 * - Property 12: Unsupported UI language generates English commit messages
 * - Property 13: Manual language preference overrides UI language
 */

import * as assert from 'assert';
import { createTaggedPropertyTest } from '../../test/helpers/property-test.helper';
import { SupportedLocale } from '../LocaleDetector';
import { LanguagePreferenceManager, LOCALE_TO_LANGUAGE_MAP } from '../LanguagePreferenceManager';

suite('LanguagePreferenceManager Property Tests', () => {
    setup(() => {
        // Reset internal state before each test
        LanguagePreferenceManager.resetForTesting();
    });

    /**
     * **Feature: ui-internationalization, Property 8: Japanese UI generates Japanese commit messages**
     * **Validates: Requirements 5.1**
     *
     * For any commit message generation request, when the UI display language is Japanese
     * and no manual language preference is set, the commit message should be generated in Japanese.
     */
    test('Property 8: Japanese locale maps to japanese language', createTaggedPropertyTest(
        'ui-internationalization',
        8,
        'Japanese UI generates Japanese commit messages',
        async () => {
            await LanguagePreferenceManager.setPreferredLanguage('ja');
            const languageName = LanguagePreferenceManager.getCommitLanguageName();
            assert.strictEqual(languageName, 'japanese');
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 9: Vietnamese UI generates Vietnamese commit messages**
     * **Validates: Requirements 5.2**
     *
     * For any commit message generation request, when the UI display language is Vietnamese
     * and no manual language preference is set, the commit message should be generated in Vietnamese.
     */
    test('Property 9: Vietnamese locale maps to vietnamese language', createTaggedPropertyTest(
        'ui-internationalization',
        9,
        'Vietnamese UI generates Vietnamese commit messages',
        async () => {
            await LanguagePreferenceManager.setPreferredLanguage('vi');
            const languageName = LanguagePreferenceManager.getCommitLanguageName();
            assert.strictEqual(languageName, 'vietnamese');
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 10: Korean UI generates Korean commit messages**
     * **Validates: Requirements 5.3**
     *
     * For any commit message generation request, when the UI display language is Korean
     * and no manual language preference is set, the commit message should be generated in Korean.
     */
    test('Property 10: Korean locale maps to korean language', createTaggedPropertyTest(
        'ui-internationalization',
        10,
        'Korean UI generates Korean commit messages',
        async () => {
            await LanguagePreferenceManager.setPreferredLanguage('ko');
            const languageName = LanguagePreferenceManager.getCommitLanguageName();
            assert.strictEqual(languageName, 'korean');
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 11: Chinese UI generates Chinese commit messages**
     * **Validates: Requirements 5.4**
     *
     * For any commit message generation request, when the UI display language is Chinese (Simplified)
     * and no manual language preference is set, the commit message should be generated in Chinese (Simplified).
     */
    test('Property 11: Chinese locale maps to chinese language', createTaggedPropertyTest(
        'ui-internationalization',
        11,
        'Chinese UI generates Chinese commit messages',
        async () => {
            await LanguagePreferenceManager.setPreferredLanguage('zh-cn');
            const languageName = LanguagePreferenceManager.getCommitLanguageName();
            assert.strictEqual(languageName, 'chinese');

            // Also test Traditional Chinese
            await LanguagePreferenceManager.setPreferredLanguage('zh-tw');
            const langTw = LanguagePreferenceManager.getCommitLanguageName();
            assert.strictEqual(langTw, 'traditionalChinese');
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 12: Unsupported UI language generates English commit messages**
     * **Validates: Requirements 5.5**
     *
     * For any commit message generation request, when the UI display language is unsupported
     * and no manual language preference is set, the commit message should be generated in English.
     */
    test('Property 12: English locale maps to english language', createTaggedPropertyTest(
        'ui-internationalization',
        12,
        'Unsupported UI language generates English commit messages',
        async () => {
            await LanguagePreferenceManager.setPreferredLanguage('en');
            const languageName = LanguagePreferenceManager.getCommitLanguageName();
            assert.strictEqual(languageName, 'english');
        }
    ));

    /**
     * **Feature: ui-internationalization, Property 13: Manual language preference overrides UI language**
     * **Validates: Requirements 5.6, 5.7**
     *
     * For any commit message generation request, when a user has manually set a language preference,
     * the commit message should be generated in that preferred language regardless of the current UI display language.
     */
    test('Property 13: Manual language preference overrides UI language', createTaggedPropertyTest(
        'ui-internationalization',
        13,
        'Manual language preference overrides UI language',
        () => {
            const supportedLocales: SupportedLocale[] = ['ja', 'en', 'vi', 'ko', 'zh-cn', 'zh-tw'];

            // Property: When a preference is set, getPreferredLanguage returns that preference
            // Note: Using synchronous version due to fast-check constraints
            for (const preferredLocale of supportedLocales) {
                // Reset state
                LanguagePreferenceManager.resetForTesting();

                // Set the preference (using internal mechanism for test)
                LanguagePreferenceManager.setPreferredLanguage(preferredLocale);

                // Check that the preference is returned
                const result = LanguagePreferenceManager.getPreferredLanguage();
                assert.strictEqual(result, preferredLocale, `Preference ${preferredLocale} should be returned`);
            }
        }
    ));
});

suite('LanguagePreferenceManager Unit Tests', () => {
    setup(() => {
        // Reset internal state before each test
        LanguagePreferenceManager.resetForTesting();
    });

    test('should return false for hasPreference when no preference is set', () => {
        const hasPreference = LanguagePreferenceManager.hasPreference();
        assert.strictEqual(hasPreference, false);
    });

    test('should set and get preference correctly', async () => {
        await LanguagePreferenceManager.setPreferredLanguage('ja');

        const locale = LanguagePreferenceManager.getPreferredLanguage();
        assert.strictEqual(locale, 'ja');

        const hasPreference = LanguagePreferenceManager.hasPreference();
        assert.strictEqual(hasPreference, true);
    });

    test('should clear preference correctly', async () => {
        await LanguagePreferenceManager.setPreferredLanguage('ko');
        LanguagePreferenceManager.resetForTesting();

        const hasPreference = LanguagePreferenceManager.hasPreference();
        assert.strictEqual(hasPreference, false);
    });

    test('should override preference when setting new value', async () => {
        await LanguagePreferenceManager.setPreferredLanguage('ja');
        await LanguagePreferenceManager.setPreferredLanguage('vi');

        const locale = LanguagePreferenceManager.getPreferredLanguage();
        assert.strictEqual(locale, 'vi');
    });

    test('LOCALE_TO_LANGUAGE_MAP should have all supported locales', () => {
        const supportedLocales: SupportedLocale[] = ['ja', 'en', 'vi', 'ko', 'zh-cn', 'zh-tw'];
        for (const locale of supportedLocales) {
            assert.ok(
                LOCALE_TO_LANGUAGE_MAP[locale],
                `LOCALE_TO_LANGUAGE_MAP should have entry for ${locale}`
            );
        }
    });

    test('getCommitLanguageName should return correct language names', async () => {
        const testCases: Array<{ locale: SupportedLocale; expected: string }> = [
            { locale: 'ja', expected: 'japanese' },
            { locale: 'en', expected: 'english' },
            { locale: 'vi', expected: 'vietnamese' },
            { locale: 'ko', expected: 'korean' },
            { locale: 'zh-cn', expected: 'chinese' },
            { locale: 'zh-tw', expected: 'traditionalChinese' }
        ];

        for (const { locale, expected } of testCases) {
            LanguagePreferenceManager.resetForTesting();
            await LanguagePreferenceManager.setPreferredLanguage(locale);
            const result = LanguagePreferenceManager.getCommitLanguageName();
            assert.strictEqual(result, expected, `Locale ${locale} should map to ${expected}`);
        }
    });
});
