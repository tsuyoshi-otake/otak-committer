/**
 * Property-based tests for API Key Manager internationalization
 *
 * **Feature: api-key-security-enhancement, Property 4: Internationalization completeness**
 *
 * For all user-facing messages in the API key management flow,
 * the messages should use the i18n translation system rather than hardcoded strings
 *
 * Validates: Requirements 4.5
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

// Import translation files directly
import en from '../../i18n/locales/en.json';
import ja from '../../i18n/locales/ja.json';
import vi from '../../i18n/locales/vi.json';
import ko from '../../i18n/locales/ko.json';
import zhCn from '../../i18n/locales/zh-cn.json';
import zhTw from '../../i18n/locales/zh-tw.json';

suite('ApiKeyManager i18n Property Tests', () => {
    /**
     * **Feature: api-key-security-enhancement, Property 4: Internationalization completeness**
     */
    suite('Property 4: Internationalization completeness', () => {
        const requiredApiKeyTranslationKeys = [
            'enterKey',
            'placeholder',
            'invalidFormat',
            'keyExists',
            'chooseAction',
            'updateKey',
            'removeKey',
            'cancel',
            'removed',
            'validatePrompt',
            'validating',
            'validationSuccess',
            'validationFailed',
            'retryPrompt'
        ];

        const locales = [
            { name: 'English', data: en },
            { name: 'Japanese', data: ja },
            { name: 'Vietnamese', data: vi },
            { name: 'Korean', data: ko },
            { name: 'Chinese Simplified', data: zhCn },
            { name: 'Chinese Traditional', data: zhTw }
        ];

        test('all API key translation keys should exist in all locales', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 4: Internationalization completeness**\n');

            const localeNamesArbitrary = fc.constantFrom(...locales.map(l => l.name));
            const keyArbitrary = fc.constantFrom(...requiredApiKeyTranslationKeys);

            runPropertyTest(
                fc.property(
                    localeNamesArbitrary,
                    keyArbitrary,
                    (localeName, key) => {
                        const locale = locales.find(l => l.name === localeName);
                        if (!locale) return false;

                        const apiKeySection = (locale.data as any).apiKey;
                        if (!apiKeySection) return false;

                        const value = apiKeySection[key];
                        // Value should exist and be a non-empty string
                        return typeof value === 'string' && value.length > 0;
                    }
                )
            );
        });

        test('each locale should have complete apiKey section', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 4: Internationalization completeness**\n');

            for (const locale of locales) {
                const apiKeySection = (locale.data as any).apiKey;
                assert.ok(apiKeySection, `${locale.name} should have apiKey section`);

                for (const key of requiredApiKeyTranslationKeys) {
                    const value = apiKeySection[key];
                    assert.ok(
                        typeof value === 'string' && value.length > 0,
                        `${locale.name} should have non-empty apiKey.${key}`
                    );
                }
            }
        });

        test('translation values should not be the same as keys', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 4: Internationalization completeness**\n');

            const keyArbitrary = fc.constantFrom(...requiredApiKeyTranslationKeys);
            const localeArbitrary = fc.constantFrom(...locales);

            runPropertyTest(
                fc.property(localeArbitrary, keyArbitrary, (locale, key) => {
                    const apiKeySection = (locale.data as any).apiKey;
                    if (!apiKeySection) return false;

                    const value = apiKeySection[key];
                    // Value should not be the same as the key (meaning it's been translated)
                    return value !== key;
                })
            );
        });

        test('validationFailed message should contain {reason} placeholder', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 4: Internationalization completeness**\n');

            const localeArbitrary = fc.constantFrom(...locales);

            runPropertyTest(
                fc.property(localeArbitrary, (locale) => {
                    const apiKeySection = (locale.data as any).apiKey;
                    if (!apiKeySection) return false;

                    const validationFailed = apiKeySection.validationFailed;
                    // Should contain {reason} placeholder for parameter interpolation
                    return typeof validationFailed === 'string' &&
                           validationFailed.includes('{reason}');
                })
            );
        });

        test('no locale should have empty strings for API key translations', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 4: Internationalization completeness**\n');

            const localeArbitrary = fc.constantFrom(...locales);
            const keyArbitrary = fc.constantFrom(...requiredApiKeyTranslationKeys);

            runPropertyTest(
                fc.property(localeArbitrary, keyArbitrary, (locale, key) => {
                    const apiKeySection = (locale.data as any).apiKey;
                    if (!apiKeySection) return false;

                    const value = apiKeySection[key];
                    // Value should not be empty or whitespace only
                    return typeof value === 'string' && value.trim().length > 0;
                })
            );
        });

        test('Japanese translations should use appropriate Japanese characters', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 4: Internationalization completeness**\n');

            const jaApiKey = (ja as any).apiKey;

            // Check a few key translations contain Japanese characters (hiragana, katakana, or kanji)
            const japaneseCharRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

            // enterKey should contain Japanese
            assert.ok(
                japaneseCharRegex.test(jaApiKey.enterKey),
                'Japanese enterKey should contain Japanese characters'
            );

            // invalidFormat should contain Japanese
            assert.ok(
                japaneseCharRegex.test(jaApiKey.invalidFormat),
                'Japanese invalidFormat should contain Japanese characters'
            );
        });

        test('Chinese translations should use appropriate Chinese characters', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 4: Internationalization completeness**\n');

            const zhCnApiKey = (zhCn as any).apiKey;
            const zhTwApiKey = (zhTw as any).apiKey;

            // Check that translations contain Chinese characters
            const chineseCharRegex = /[\u4E00-\u9FFF]/;

            assert.ok(
                chineseCharRegex.test(zhCnApiKey.enterKey),
                'Simplified Chinese enterKey should contain Chinese characters'
            );

            assert.ok(
                chineseCharRegex.test(zhTwApiKey.enterKey),
                'Traditional Chinese enterKey should contain Chinese characters'
            );
        });

        test('Korean translations should use appropriate Korean characters', () => {
            console.log('\n**Feature: api-key-security-enhancement, Property 4: Internationalization completeness**\n');

            const koApiKey = (ko as any).apiKey;

            // Check that translations contain Korean characters (Hangul)
            const koreanCharRegex = /[\uAC00-\uD7AF\u1100-\u11FF]/;

            assert.ok(
                koreanCharRegex.test(koApiKey.enterKey),
                'Korean enterKey should contain Korean characters'
            );
        });
    });
});
