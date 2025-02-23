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