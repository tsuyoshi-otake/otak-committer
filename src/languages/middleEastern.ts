import { PromptType } from '../types/language';
import { getArabicPrompt } from './arabic';
import { getHebrewPrompt } from './hebrew';

type MiddleEasternLanguages = 
    | 'arabic'
    | 'hebrew';

/**
 * 中東言語のプロンプトを取得する関数
 * 注: これらの言語は右から左に読む（RTL）特性を持つ
 */
export const getMiddleEasternPrompt = (language: MiddleEasternLanguages, type: PromptType): string => {
    const promptMap = {
        arabic: getArabicPrompt,
        hebrew: getHebrewPrompt
    };

    // RTL言語のため、必要に応じてRTLマーカー（\u202B）を追加
    const prompt = promptMap[language](type);
    const isRtlContent = true; // 将来的に言語ごとにRTLかどうかを判定する場合に備えて

    if (isRtlContent) {
        return `\u202B${prompt}`;
    }

    return prompt;
};