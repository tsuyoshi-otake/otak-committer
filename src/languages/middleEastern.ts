import { PromptType } from '../types/enums/PromptType';
import { getArabicPrompt } from './arabic';
import { getHebrewPrompt } from './hebrew';
import { getTurkishPrompt } from './turkish';

/**
 * 中東言語グループのプロンプト管理
 * 各言語の設定とローカライズされたプロンプトを提供します
 * RTL（右から左）言語のサポートを含みます
 */

export type MiddleEasternLanguageCode =
    | 'ar' // アラビア語
    | 'he' // ヘブライ語
    | 'tr'; // トルコ語

export const getMiddleEasternPrompt = (
    language: MiddleEasternLanguageCode,
    type: PromptType,
): string => {
    const promptMap: Record<MiddleEasternLanguageCode, (type: PromptType) => string> = {
        ar: getArabicPrompt,
        he: getHebrewPrompt,
        tr: getTurkishPrompt,
    };

    return promptMap[language]?.(type) || '';
};

export const middleEasternLanguages: Record<MiddleEasternLanguageCode, string> = {
    ar: 'العربية',
    he: 'עברית',
    tr: 'Türkçe',
};

// RTL言語のリスト
export const rtlLanguages: MiddleEasternLanguageCode[] = ['ar', 'he'];
