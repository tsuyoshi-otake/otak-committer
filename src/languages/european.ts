import { PromptType } from '../types/language';
import { getFrenchPrompt } from './french';
import { getGermanPrompt } from './german';
import { getItalianPrompt } from './italian';
import { getSpanishPrompt } from './spanish';
import { getPortuguesePrompt } from './portuguese';
import { getCzechPrompt } from './czech';
import { getHungarianPrompt } from './hungarian';
import { getBulgarianPrompt } from './bulgarian';
import { getTurkishPrompt } from './turkish';
import { getRussianPrompt } from './russian';

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

export const getEuropeanPrompt = (language: EuropeanLanguages, type: PromptType): string => {
    const promptMap = {
        french: getFrenchPrompt,
        german: getGermanPrompt,
        italian: getItalianPrompt,
        spanish: getSpanishPrompt,
        portuguese: getPortuguesePrompt,
        czech: getCzechPrompt,
        hungarian: getHungarianPrompt,
        bulgarian: getBulgarianPrompt,
        turkish: getTurkishPrompt,
        russian: getRussianPrompt
    };

    return promptMap[language](type);
};