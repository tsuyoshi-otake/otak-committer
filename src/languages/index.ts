import { PromptType } from '../types/language';
import { getEuropeanPrompt } from './european';
import { getAsianPrompt } from './asian';
import { getMiddleEasternPrompt } from './middleEastern';
import { getEnglishPrompt } from './english';

type EuropeanLanguages = 
    | 'french'
    | 'german'
    | 'italian'
    | 'spanish'
    | 'portuguese'
    | 'czech'
    | 'hungarian'
    | 'bulgarian'
    | 'turkish'
    | 'russian';

type AsianLanguages = 
    | 'chinese'
    | 'traditionalChinese'
    | 'korean'
    | 'vietnamese'
    | 'thai'
    | 'hindi'
    | 'bengali'
    | 'javanese'
    | 'tamil'
    | 'burmese';

type MiddleEasternLanguages = 
    | 'arabic'
    | 'hebrew';

export type SupportedLanguage = 
    | 'english'
    | EuropeanLanguages
    | AsianLanguages
    | MiddleEasternLanguages;

/**
 * 指定された言語とタイプに基づいてプロンプトを取得する
 * @param language サポートされている言語
 * @param type プロンプトタイプ
 * @returns プロンプト文字列
 */
export const getPrompt = (language: SupportedLanguage, type: PromptType): string => {
    // 言語グループの判定
    const europeanLanguages: EuropeanLanguages[] = [
        'french', 'german', 'italian', 'spanish', 'portuguese',
        'czech', 'hungarian', 'bulgarian', 'turkish', 'russian'
    ];
    const asianLanguages: AsianLanguages[] = [
        'chinese', 'traditionalChinese', 'korean', 'vietnamese', 'thai',
        'hindi', 'bengali', 'javanese', 'tamil', 'burmese'
    ];
    const middleEasternLanguages: MiddleEasternLanguages[] = [
        'arabic', 'hebrew'
    ];

    // 言語グループに基づいて適切なプロンプト生成関数を選択
    if (language === 'english') {
        return getEnglishPrompt(type);
    } else if (europeanLanguages.includes(language as EuropeanLanguages)) {
        return getEuropeanPrompt(language as EuropeanLanguages, type);
    } else if (asianLanguages.includes(language as AsianLanguages)) {
        return getAsianPrompt(language as AsianLanguages, type);
    } else if (middleEasternLanguages.includes(language as MiddleEasternLanguages)) {
        return getMiddleEasternPrompt(language as MiddleEasternLanguages, type);
    }

    // デフォルトは英語を返す
    return getEnglishPrompt(type);
};