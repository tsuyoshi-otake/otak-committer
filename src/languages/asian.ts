import { PromptType } from '../types/language';
import { getChinesePrompt } from './chinese';
import { getTraditionalChinesePrompt } from './traditionalChinese';
import { getKoreanPrompt } from './korean';
import { getVietnamesePrompt } from './vietnamese';
import { getThaiPrompt } from './thai';
import { getHindiPrompt } from './hindi';
import { getBengaliPrompt } from './bengali';
import { getJavanesePrompt } from './javanese';
import { getTamilPrompt } from './tamil';
import { getBurmesePrompt } from './burmese';

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

export const getAsianPrompt = (language: AsianLanguages, type: PromptType): string => {
    const promptMap = {
        chinese: getChinesePrompt,
        traditionalChinese: getTraditionalChinesePrompt,
        korean: getKoreanPrompt,
        vietnamese: getVietnamesePrompt,
        thai: getThaiPrompt,
        hindi: getHindiPrompt,
        bengali: getBengaliPrompt,
        javanese: getJavanesePrompt,
        tamil: getTamilPrompt,
        burmese: getBurmesePrompt
    };

    return promptMap[language](type);
};