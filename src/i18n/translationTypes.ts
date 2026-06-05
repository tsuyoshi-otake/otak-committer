/**
 * Translation dictionary type.
 */
export type TranslationDictionary = {
    [key: string]: string | TranslationDictionary;
};

/**
 * Translation parameters type.
 */
export type TranslationParams = Record<string, string | number>;
