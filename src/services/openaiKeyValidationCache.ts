import * as crypto from 'crypto';
import { resolveOpenAIBaseUrl } from './openaiConnection';

const validatedConnectionHashes = new Set<string>();

function hashConnection(apiKey: string, baseURL: string): string {
    const normalizedBaseURL = resolveOpenAIBaseUrl(baseURL);
    return crypto
        .createHash('sha256')
        .update(`${normalizedBaseURL}\0${apiKey}`)
        .digest('hex');
}

/**
 * Checks whether the given API key was validated during the current extension session.
 *
 * Uses an in-memory SHA-256 hash cache so the raw key is never stored in memory structures.
 *
 * @param apiKey - OpenAI API key
 * @returns True if the key is already validated for this session
 */
export function isConnectionValidated(apiKey: string, baseURL: string): boolean {
    const trimmed = apiKey.trim();
    if (!trimmed) {
        return false;
    }
    return validatedConnectionHashes.has(hashConnection(trimmed, baseURL));
}

/**
 * Marks the given API key as validated for the current extension session.
 *
 * @param apiKey - OpenAI API key
 */
export function markConnectionValidated(apiKey: string, baseURL: string): void {
    const trimmed = apiKey.trim();
    if (!trimmed) {
        return;
    }
    validatedConnectionHashes.add(hashConnection(trimmed, baseURL));
}

/**
 * Invalidates the validation cache entry for the given API key.
 *
 * This is used when a key may have been revoked mid-session so the next operation
 * will re-validate it.
 *
 * @param apiKey - OpenAI API key
 */
export function invalidateValidatedConnection(apiKey: string, baseURL: string): void {
    const trimmed = apiKey.trim();
    if (!trimmed) {
        return;
    }
    validatedConnectionHashes.delete(hashConnection(trimmed, baseURL));
}
