import * as vscode from 'vscode';
import { asianLanguages } from './asian';
import { europeanLanguages } from './european';
import { middleEasternLanguages } from './middleEastern';
import { LanguageConfig } from '../types/language';

export const LANGUAGE_CONFIGS: { [key: string]: LanguageConfig } = {
    ...asianLanguages,
    ...europeanLanguages,
    ...middleEasternLanguages
};

/**
 * 現在の言語設定を取得
 */
export function getCurrentLanguageConfig(): LanguageConfig {
    const config = vscode.workspace.getConfiguration('otakCommitter');
    const currentLanguage = config.get<string>('language') || 'english';
    return LANGUAGE_CONFIGS[currentLanguage] || LANGUAGE_CONFIGS.english;
}

/**
 * 言語選択UIを表示
 */
export async function showLanguageQuickPick(): Promise<string | undefined> {
    const languages = Object.entries(LANGUAGE_CONFIGS).map(([id, config]) => ({
        label: config.name,
        description: id,
        detail: config.description
    }));

    const selected = await vscode.window.showQuickPick(languages, {
        placeHolder: 'Select commit message language'
    });

    return selected?.description;
}

/**
 * システムプロンプトを生成
 */
export function generateSystemPrompt(language: LanguageConfig): string {
    return `You are a helpful assistant that generates commit messages in ${language.name}.
Please follow these rules:
1. Write messages in ${language.name}
2. Use appropriate grammar and tone for the selected language
3. Follow conventional commit message format
4. Be clear and concise
5. Focus on the changes made in the code

${language.systemPrompt || ''}`;
}