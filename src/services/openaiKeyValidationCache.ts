import * as crypto from 'crypto';

const validatedKeyHashes = new Set<string>();

function hashKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Checks whether the given API key was validated during the current extension session.
 *
 * Uses an in-memory SHA-256 hash cache so the raw key is never stored in memory structures.
 *
 * @param apiKey - OpenAI API key
 * @returns True if the key is already validated for this session
 */
export function isApiKeyValidated(apiKey: string): boolean {
    const trimmed = apiKey.trim();
    if (!trimmed) {
        return false;
    }
    return validatedKeyHashes.has(hashKey(trimmed));
}

/**
 * Marks the given API key as validated for the current extension session.
 *
 * @param apiKey - OpenAI API key
 */
export function markApiKeyValidated(apiKey: string): void {
    const trimmed = apiKey.trim();
    if (!trimmed) {
        return;
    }
    validatedKeyHashes.add(hashKey(trimmed));
}

/**
 * Invalidates the validation cache entry for the given API key.
 *
 * This is used when a key may have been revoked mid-session so the next operation
 * will re-validate it.
 *
 * @param apiKey - OpenAI API key
 */
export function invalidateValidatedApiKey(apiKey: string): void {
    const trimmed = apiKey.trim();
    if (!trimmed) {
        return;
    }
    validatedKeyHashes.delete(hashKey(trimmed));
}
