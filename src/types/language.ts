export type PromptType = 
    | 'system'
    | 'commit'
    | 'prTitle'
    | 'prBody';

export interface LanguageSettings {
    language: string;
    messageStyle: string;
}

export interface LanguageConfig {
    name: string;
    label: string;
    description: string;
    isRTL?: boolean;
}

export type LanguageConfigType = {
    readonly [key: string]: LanguageConfig;
};