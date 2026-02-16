/**
 * Property-based tests for API Key Manager internationalization
 *
 * **Feature: api-key-security-enhancement, Property 4: Internationalization completeness**
 *
 * For all user-facing messages in the API key management flow,
 * the messages should use the i18n translation system rather than hardcoded strings.
 *
 * Note: UI localization only supports English and Japanese.
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

import en from '../../i18n/locales/en.json';
import ja from '../../i18n/locales/ja.json';

suite('ApiKeyManager i18n Property Tests', () => {
    suite('Property 4: Internationalization completeness', () => {
        const requiredApiKeyTranslationKeys = [
            'enterKey',
            'placeholder',
            'invalidFormat',
            'keyExists',
            'chooseAction',
            'updateKey',
            'validateKey',
            'removeKey',
            'cancel',
            'removed',
            'validatePrompt',
            'validating',
            'validationSuccess',
            'validationFailed',
            'retryValidation',
            'continueWithoutValidation',
            'retryPrompt',
            'invalidKeyPrompt',
            'errorPrompt',
            'setApiKey'
        ];

        const locales = [
            { name: 'English', data: en },
            { name: 'Japanese', data: ja }
        ];

        test('all API key translation keys should exist in all locales', () => {
            const localeNamesArbitrary = fc.constantFrom(...locales.map(l => l.name));
            const keyArbitrary = fc.constantFrom(...requiredApiKeyTranslationKeys);

            runPropertyTest(
                fc.property(localeNamesArbitrary, keyArbitrary, (localeName, key) => {
                    const locale = locales.find(l => l.name === localeName);
                    if (!locale) {
                        return false;
                    }

                    const apiKeySection = (locale.data as any).apiKey;
                    if (!apiKeySection) {
                        return false;
                    }

                    const value = apiKeySection[key];
                    return typeof value === 'string' && value.trim().length > 0;
                })
            );
        });

        test('each locale should have complete apiKey section', () => {
            for (const locale of locales) {
                const apiKeySection = (locale.data as any).apiKey;
                assert.ok(apiKeySection, `${locale.name} should have apiKey section`);

                for (const key of requiredApiKeyTranslationKeys) {
                    const value = apiKeySection[key];
                    assert.ok(
                        typeof value === 'string' && value.trim().length > 0,
                        `${locale.name} should have non-empty apiKey.${key}`
                    );
                }
            }
        });

        test('translation values should not be the same as keys', () => {
            const keyArbitrary = fc.constantFrom(...requiredApiKeyTranslationKeys);
            const localeArbitrary = fc.constantFrom(...locales);

            runPropertyTest(
                fc.property(localeArbitrary, keyArbitrary, (locale, key) => {
                    const apiKeySection = (locale.data as any).apiKey;
                    if (!apiKeySection) {
                        return false;
                    }
                    return apiKeySection[key] !== key;
                })
            );
        });

        test('validationFailed message should contain {reason} placeholder', () => {
            const localeArbitrary = fc.constantFrom(...locales);

            runPropertyTest(
                fc.property(localeArbitrary, (locale) => {
                    const apiKeySection = (locale.data as any).apiKey;
                    if (!apiKeySection) {
                        return false;
                    }

                    const validationFailed = apiKeySection.validationFailed;
                    return typeof validationFailed === 'string' && validationFailed.includes('{reason}');
                })
            );
        });

        test('Japanese translations should use appropriate Japanese characters', () => {
            const jaApiKey = (ja as any).apiKey;
            const japaneseCharRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

            assert.ok(
                japaneseCharRegex.test(jaApiKey.enterKey),
                'Japanese enterKey should contain Japanese characters'
            );

            assert.ok(
                japaneseCharRegex.test(jaApiKey.invalidFormat),
                'Japanese invalidFormat should contain Japanese characters'
            );
        });
    });
});

