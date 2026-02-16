import { PromptType } from '../types/enums/PromptType';
import type { SupportedLanguage } from './index';
import { getEuropeanPrompt } from './european';
import { getAsianPrompt } from './asian';
import { getMiddleEasternPrompt } from './middleEastern';
import { getEnglishPrompt } from './english';
import { getJapanesePrompt } from './japanese';

const EUROPEAN_LANG_TO_CODE: Record<string, string> = {
    french: 'fr',
    german: 'de',
    italian: 'it',
    spanish: 'es',
    portuguese: 'pt',
    czech: 'cs',
    hungarian: 'hu',
    bulgarian: 'bg',
    polish: 'pl',
    russian: 'ru'
};

const ASIAN_LANG_TO_CODE: Record<string, string> = {
    chinese: 'zh',
    traditionalChinese: 'zh-tw',
    korean: 'ko',
    vietnamese: 'vi',
    thai: 'th',
    hindi: 'hi',
    bengali: 'bn',
    javanese: 'jv',
    tamil: 'ta',
    burmese: 'my'
};

const MIDDLE_EASTERN_LANG_TO_CODE: Record<string, string> = {
    arabic: 'ar',
    hebrew: 'he',
    turkish: 'tr'
};

/**
 * 指定された言語とタイプに基づいてプロンプトを取得する
 * @param language サポートされている言語
 * @param type プロンプトタイプ
 * @returns プロンプト文字列
 */
export const getPrompt = (language: SupportedLanguage, type: PromptType): string => {
    // 言語グループの判定
    if (language === 'japanese') {
        return getJapanesePrompt(type);
    }

    if (language === 'english') {
        return getEnglishPrompt(type);
    }

    const europeanCode = EUROPEAN_LANG_TO_CODE[language];
    if (europeanCode) {
        return getEuropeanPrompt(europeanCode as any, type);
    }

    const asianCode = ASIAN_LANG_TO_CODE[language];
    if (asianCode) {
        return getAsianPrompt(asianCode as any, type);
    }

    const middleEasternCode = MIDDLE_EASTERN_LANG_TO_CODE[language];
    if (middleEasternCode) {
        return getMiddleEasternPrompt(middleEasternCode as any, type);
    }

    // デフォルトは英語を返す
    return getEnglishPrompt(type);
};

