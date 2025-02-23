import * as vscode from 'vscode';
import { LANGUAGE_CONFIGS } from '../languages';

export type Language = string;

export type PromptType = 'system' | 'commit' | 'pr';

export interface LanguageConfig {
    name: string;
    getPrompt: (type: PromptType) => Promise<string>;
}

export interface LanguagePrompt {
    system: string;
    commit: string;
    pr: string;
}

export async function getCurrentLanguageConfig(): Promise<LanguageConfig> {
    const config = vscode.workspace.getConfiguration('otakCommitter');
    const language = config.get<string>('language') || 'japanese';
    return LANGUAGE_CONFIGS[language];
}