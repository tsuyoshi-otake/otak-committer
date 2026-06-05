import { TranslationDictionary, TranslationParams } from './translationTypes';

/**
 * Interpolate parameters into a string.
 */
export function interpolateTranslation(str: string, params: TranslationParams): string {
    return str.replace(/\{(\w+)\}/g, (match, key) => {
        if (params.hasOwnProperty(key)) {
            return String(params[key]);
        }
        return match;
    });
}

/**
 * Get nested value from a translation dictionary using a dot-separated key.
 */
export function getNestedTranslation(obj: TranslationDictionary, key: string): string | undefined {
    const parts = key.split('.');
    let current: TranslationDictionary | string = obj;

    for (const part of parts) {
        if (current === undefined || current === null || typeof current === 'string') {
            return undefined;
        }
        current = current[part];
    }

    return typeof current === 'string' ? current : undefined;
}
