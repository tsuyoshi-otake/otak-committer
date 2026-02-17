import { PromptType } from '../types/enums/PromptType';
import { getEnglishPrompt } from './english';
import { getFrenchPrompt } from './french';
import { getGermanPrompt } from './german';
import { getItalianPrompt } from './italian';
import { getSpanishPrompt } from './spanish';
import { getPortuguesePrompt } from './portuguese';
import { getRussianPrompt } from './russian';
import { getPolishPrompt } from './polish';
import { getCzechPrompt } from './czech';
import { getHungarianPrompt } from './hungarian';
import { getBulgarianPrompt } from './bulgarian';

/**
 * ヨーロッパ言語グループのプロンプト管理
 * 各言語の設定とローカライズされたプロンプトを提供します
 */

export type EuropeanLanguageCode =
    | 'en' // 英語
    | 'fr' // フランス語
    | 'de' // ドイツ語
    | 'it' // イタリア語
    | 'es' // スペイン語
    | 'pt' // ポルトガル語
    | 'ru' // ロシア語
    | 'pl' // ポーランド語
    | 'cs' // チェコ語
    | 'hu' // ハンガリー語
    | 'bg'; // ブルガリア語

export const getEuropeanPrompt = (language: EuropeanLanguageCode, type: PromptType): string => {
    const promptMap: Record<EuropeanLanguageCode, (type: PromptType) => string> = {
        en: getEnglishPrompt,
        fr: getFrenchPrompt,
        de: getGermanPrompt,
        it: getItalianPrompt,
        es: getSpanishPrompt,
        pt: getPortuguesePrompt,
        ru: getRussianPrompt,
        pl: getPolishPrompt,
        cs: getCzechPrompt,
        hu: getHungarianPrompt,
        bg: getBulgarianPrompt,
    };

    return promptMap[language]?.(type) || '';
};

export const europeanLanguages: Record<EuropeanLanguageCode, string> = {
    en: 'English',
    fr: 'Français',
    de: 'Deutsch',
    it: 'Italiano',
    es: 'Español',
    pt: 'Português',
    ru: 'Русский',
    pl: 'Polski',
    cs: 'Čeština',
    hu: 'Magyar',
    bg: 'Български',
};
