/**
 * @deprecated Import from '../types/enums/PromptType' instead
 */
export { PromptType } from './enums/PromptType';

/**
 * @deprecated Import from '../types/interfaces/Config' instead
 */
export type { LanguageSettings, LanguageConfig } from './interfaces/Config';

/**
 * @deprecated Use Record<string, LanguageConfig> instead
 */
export type LanguageConfigType = {
    readonly [key: string]: import('./interfaces/Config').LanguageConfig;
};
