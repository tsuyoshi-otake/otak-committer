import type { LanguageConfig } from '../types/language';
import { asianLanguages, asianLanguageDescriptions } from './asian';
import { europeanLanguages, europeanLanguageDescriptions } from './european';
import { middleEasternLanguages, middleEasternLanguageDescriptions } from './middleEastern';

// 全言語設定をマージ
export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
    ...europeanLanguages,
    ...asianLanguages,
    ...middleEasternLanguages
};

// 全言語の説明をマージ
export const LANGUAGE_DESCRIPTIONS: Record<string, string> = {
    ...europeanLanguageDescriptions,
    ...asianLanguageDescriptions,
    ...middleEasternLanguageDescriptions
};

// デフォルト言語
export const DEFAULT_LANGUAGE = 'japanese';

// 言語グループの定義（表示順序用）
export const LANGUAGE_GROUPS = {
    european: Object.keys(europeanLanguages),
    asian: Object.keys(asianLanguages),
    middleEastern: Object.keys(middleEasternLanguages)
} as const;

// 合計サポート言語数
export const SUPPORTED_LANGUAGE_COUNT = Object.keys(LANGUAGE_CONFIGS).length;