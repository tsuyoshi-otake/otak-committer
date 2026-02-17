import * as assert from 'assert';
import * as vscode from 'vscode';
import { SupportedLanguage, LANGUAGE_CONFIGS } from '../languages';
import { LanguageSettings } from '../types/language';

suite('Extension Test Suite', () => {
    test('Languages configuration test', () => {
        // 設定から言語を取得
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const settings: LanguageSettings = {
            language: config.get<string>('language') || 'english',
            messageStyle: config.get<string>('messageStyle') || 'normal',
        };

        // 言語設定が存在することを確認
        const languageConfig = LANGUAGE_CONFIGS[settings.language as SupportedLanguage];
        assert.ok(languageConfig, 'Language configuration should exist');
    });

    test('All supported languages have proper configuration', () => {
        // すべての言語設定が必要なプロパティを持っていることを確認
        Object.entries(LANGUAGE_CONFIGS).forEach(([key, config]) => {
            assert.ok(config.name, `${key} should have a name`);
            assert.ok(config.label, `${key} should have a label`);
            assert.ok(config.description, `${key} should have a description`);
        });
    });

    test('RTL languages are properly marked', () => {
        // RTL言語の確認
        const rtlLanguages = ['arabic', 'hebrew'];
        rtlLanguages.forEach((lang) => {
            const config = LANGUAGE_CONFIGS[lang as SupportedLanguage];
            assert.strictEqual(config.isRTL, true, `${lang} should be marked as RTL`);
        });
    });

    test('Default language fallback', () => {
        // デフォルト言語（英語）の設定が存在することを確認
        const englishConfig = LANGUAGE_CONFIGS['english'];
        assert.ok(englishConfig, 'English configuration should exist as fallback');
        assert.strictEqual(englishConfig.name, 'English');
    });
});
