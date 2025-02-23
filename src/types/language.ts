import type { MessageStyle } from './messageStyle';

export interface LanguageConfig {
    name: string;
    description: string;
    systemPrompt: (style: MessageStyle) => string;
    diffMessage: string;
}

export interface LanguageDescriptions {
    [key: string]: {
        name: string;
        description: string;
    };
}

export const LANGUAGE_DESCRIPTIONS: LanguageDescriptions = {
    english: {
        name: "English",
        description: "Generate commit messages in English"
    },
    japanese: {
        name: "日本語",
        description: "コミットメッセージを日本語で生成"
    },
    chinese: {
        name: "中文",
        description: "用中文生成提交消息"
    }
    // 他の言語も同様に追加
};