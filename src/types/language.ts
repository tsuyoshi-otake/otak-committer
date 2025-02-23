export type Language = string;

export type PromptType = 'system' | 'commit' | 'prTitle' | 'prBody';

export interface LanguageConfig {
    name: string;
    getPrompt: (type: PromptType) => Promise<string>;
}

export interface LanguagePrompt {
    system: string;
    commit: string;
    prTitle: string;
    prBody: string;
}