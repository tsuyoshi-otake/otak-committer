/**
 * Integration tests for the i18n module
 *
 * These tests verify that the translation system works correctly
 * in an integrated environment.
 *
 * Note: Some tests require VS Code context and should be run
 * through the VS Code test runner.
 */

import * as assert from 'assert';
import { TranslationManager, LocaleDetector, t } from '../../i18n/index';

suite('i18n Integration Tests', () => {
    setup(() => {
        // Reset singleton before each test
        TranslationManager.resetInstance();
    });

    teardown(() => {
        // Clean up after each test
        TranslationManager.resetInstance();
    });

    suite('TranslationManager Integration', () => {
        test('should initialize with default locale', () => {
            const manager = TranslationManager.getInstance();
            const locale = manager.getLocale();

            // Should be one of supported locales
            assert.ok(['ja', 'en'].includes(locale), `Expected locale to be a supported locale, got '${locale}'`);
        });

        test('should provide same instance across multiple calls', () => {
            const instance1 = TranslationManager.getInstance();
            const instance2 = TranslationManager.getInstance();

            assert.strictEqual(instance1, instance2, 'Should return same singleton instance');
        });

        test('should translate keys correctly for English locale', () => {
            const manager = TranslationManager.getInstance();
            manager.setLocale('en');

            // Test various translation keys
            const apiKeySaved = manager.t('messages.apiKeySaved');
            assert.strictEqual(apiKeySaved, 'API key saved successfully');

            const configuration = manager.t('statusBar.configuration');
            assert.strictEqual(configuration, 'Configuration');
        });

        test('should translate keys correctly for Japanese locale', () => {
            const manager = TranslationManager.getInstance();
            manager.setLocale('ja');

            // Test various translation keys
            const apiKeySaved = manager.t('messages.apiKeySaved');
            assert.strictEqual(apiKeySaved, 'APIキーを保存しました');

            const configuration = manager.t('statusBar.configuration');
            assert.strictEqual(configuration, '設定');
        });

        test('should handle parameter interpolation', () => {
            const manager = TranslationManager.getInstance();
            manager.setLocale('en');

            const message = manager.t('messages.languageChanged', { language: 'Japanese' });
            assert.strictEqual(message, 'Language changed to Japanese');

            manager.setLocale('ja');
            const messageJa = manager.t('messages.languageChanged', { language: '日本語' });
            assert.strictEqual(messageJa, '言語を日本語に変更しました');
        });

        test('should handle numeric parameters', () => {
            const manager = TranslationManager.getInstance();
            manager.setLocale('en');

            const message = manager.t('messages.prCreatedSuccess', { prType: 'Draft PR', number: 42 });
            assert.strictEqual(message, 'Draft PR #42 created successfully!');
        });
    });

    suite('Global t() function', () => {
        test('should use singleton TranslationManager', () => {
            const manager = TranslationManager.getInstance();
            manager.setLocale('en');

            const fromT = t('messages.apiKeySaved');
            const fromManager = manager.t('messages.apiKeySaved');

            assert.strictEqual(fromT, fromManager, 'Global t() should use singleton');
        });

        test('should support parameter interpolation', () => {
            const manager = TranslationManager.getInstance();
            manager.setLocale('en');

            const message = t('messages.languageChanged', { language: 'French' });
            assert.strictEqual(message, 'Language changed to French');
        });
    });

    suite('LocaleDetector', () => {
        test('should detect Japanese locale correctly', () => {
            assert.strictEqual(LocaleDetector.detectLocale('ja'), 'ja');
            assert.strictEqual(LocaleDetector.detectLocale('ja-JP'), 'ja');
            assert.strictEqual(LocaleDetector.detectLocale('ja-jp'), 'ja');
        });

        test('should detect English locale correctly', () => {
            assert.strictEqual(LocaleDetector.detectLocale('en'), 'en');
            assert.strictEqual(LocaleDetector.detectLocale('en-US'), 'en');
            assert.strictEqual(LocaleDetector.detectLocale('en-GB'), 'en');
        });

        test('should default to English for unsupported locales', () => {
            assert.strictEqual(LocaleDetector.detectLocale('fr'), 'en');
            assert.strictEqual(LocaleDetector.detectLocale('de'), 'en');
            assert.strictEqual(LocaleDetector.detectLocale('es'), 'en');
            assert.strictEqual(LocaleDetector.detectLocale('vi'), 'en');
            assert.strictEqual(LocaleDetector.detectLocale('ko'), 'en');
            assert.strictEqual(LocaleDetector.detectLocale('zh-cn'), 'en');
            assert.strictEqual(LocaleDetector.detectLocale('zh-tw'), 'en');
        });

        test('should default to English for undefined/empty', () => {
            assert.strictEqual(LocaleDetector.detectLocale(undefined), 'en');
            assert.strictEqual(LocaleDetector.detectLocale(''), 'en');
        });
    });

    suite('Locale Switching', () => {
        test('should switch locale dynamically', () => {
            const manager = TranslationManager.getInstance();

            // Start with English
            manager.setLocale('en');
            assert.strictEqual(manager.t('statusBar.configuration'), 'Configuration');

            // Switch to Japanese
            manager.setLocale('ja');
            assert.strictEqual(manager.t('statusBar.configuration'), '設定');

            // Switch back to English
            manager.setLocale('en');
            assert.strictEqual(manager.t('statusBar.configuration'), 'Configuration');
        });

        test('should maintain locale state across t() calls', () => {
            const manager = TranslationManager.getInstance();
            manager.setLocale('ja');

            // Multiple calls should use same locale
            const msg1 = manager.t('statusBar.configuration');
            const msg2 = manager.t('statusBar.currentStyle');
            const msg3 = manager.t('statusBar.setApiKey');

            assert.strictEqual(msg1, '設定');
            assert.strictEqual(msg2, '現在のスタイル');
            assert.strictEqual(msg3, 'APIキーを設定');
        });
    });

    suite('Fallback Behavior', () => {
        test('should return key for non-existent translation', () => {
            const manager = TranslationManager.getInstance();
            manager.setLocale('en');

            const result = manager.t('nonexistent.key');
            assert.strictEqual(result, 'nonexistent.key');
        });

        test('should return key for deeply nested non-existent key', () => {
            const manager = TranslationManager.getInstance();
            manager.setLocale('ja');

            const result = manager.t('deeply.nested.nonexistent.key');
            assert.strictEqual(result, 'deeply.nested.nonexistent.key');
        });
    });

    suite('Translation Coverage', () => {
        const supportedLocales = ['en', 'ja'] as const;

        test('should have translations for all command strings', () => {
            const manager = TranslationManager.getInstance();

            const commandKeys = [
                'commands.generateCommit',
                'commands.generatePR',
                'commands.generateIssue',
                'commands.changeLanguage',
                'commands.changeMessageStyle',
                'commands.setApiKey',
                'commands.openSettings'
            ];

            // Test all supported locales
            for (const locale of supportedLocales) {
                manager.setLocale(locale);
                for (const key of commandKeys) {
                    const translation = manager.t(key);
                    assert.notStrictEqual(translation, key, `Missing ${locale} translation for ${key}`);
                }
            }
        });

        test('should have translations for all message strings', () => {
            const manager = TranslationManager.getInstance();

            const messageKeys = [
                'messages.apiKeyNotConfigured',
                'messages.apiKeySaved',
                'messages.authRequired',
                'messages.noChangesToCommit',
                'messages.commitMessageGenerated'
            ];

            // Test all supported locales
            for (const locale of supportedLocales) {
                manager.setLocale(locale);
                for (const key of messageKeys) {
                    const translation = manager.t(key);
                    assert.notStrictEqual(translation, key, `Missing ${locale} translation for ${key}`);
                }
            }
        });

        test('should have translations for all status bar strings', () => {
            const manager = TranslationManager.getInstance();

            const statusBarKeys = [
                'statusBar.configuration',
                'statusBar.currentStyle',
                'statusBar.setApiKey',
                'statusBar.openSettings'
            ];

            // Test all supported locales
            for (const locale of supportedLocales) {
                manager.setLocale(locale);
                for (const key of statusBarKeys) {
                    const translation = manager.t(key);
                    assert.notStrictEqual(translation, key, `Missing ${locale} translation for ${key}`);
                }
            }
        });
    });
});
