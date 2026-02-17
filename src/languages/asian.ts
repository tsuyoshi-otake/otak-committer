import { PromptType } from '../types/enums/PromptType';
import { getJapanesePrompt } from './japanese';
import { getChinesePrompt } from './chinese';
import { getTraditionalChinesePrompt } from './traditionalChinese';
import { getKoreanPrompt } from './korean';
import { getVietnamesePrompt } from './vietnamese';
import { getThaiPrompt } from './thai';
import { getHindiPrompt } from './hindi';
import { getBengaliPrompt } from './bengali';
import { getBurmesePrompt } from './burmese';
import { getJavanesePrompt } from './javanese';
import { getTamilPrompt } from './tamil';

/**
 * アジア言語グループのプロンプト管理
 * 各言語の設定とローカライズされたプロンプトを提供します
 */

export type AsianLanguageCode =
    | 'ja' // 日本語
    | 'zh' // 中国語（簡体字）
    | 'zh-tw' // 中国語（繁体字）
    | 'ko' // 韓国語
    | 'vi' // ベトナム語
    | 'th' // タイ語
    | 'hi' // ヒンディー語
    | 'bn' // ベンガル語
    | 'my' // ビルマ語
    | 'jv' // ジャワ語
    | 'ta'; // タミル語

export const getAsianPrompt = (language: AsianLanguageCode, type: PromptType): string => {
    const promptMap: Record<AsianLanguageCode, (type: PromptType) => string> = {
        ja: getJapanesePrompt,
        zh: getChinesePrompt,
        'zh-tw': getTraditionalChinesePrompt,
        ko: getKoreanPrompt,
        vi: getVietnamesePrompt,
        th: getThaiPrompt,
        hi: getHindiPrompt,
        bn: getBengaliPrompt,
        my: getBurmesePrompt,
        jv: getJavanesePrompt,
        ta: getTamilPrompt,
    };

    return promptMap[language]?.(type) || '';
};

export const asianLanguages: Record<AsianLanguageCode, string> = {
    ja: '日本語',
    zh: '简体中文',
    'zh-tw': '繁體中文',
    ko: '한국어',
    vi: 'Tiếng Việt',
    th: 'ไทย',
    hi: 'हिन्दी',
    bn: 'বাংলা',
    my: 'မြန်မာစာ',
    jv: 'Basa Jawa',
    ta: 'தமிழ்',
};
