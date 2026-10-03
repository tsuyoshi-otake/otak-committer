/**
 * Secret redaction shared by log output and error formatting.
 *
 * One rule set decides which field names are sensitive and which values look like
 * credentials, so logs and formatted error context (`formatErrorDetail`) cannot drift apart.
 */
import { redactPotentialSecrets } from './secretDetection';

export const REDACTED = '[REDACTED]';

/**
 * Lowercase substrings that mark a field name as sensitive (matches e.g.
 * `accessToken`, `client_secret`, `privateKey`, `X-Api-Key`, `OPENAI_API_KEY`).
 */
const SENSITIVE_FIELD_MARKERS = [
    'apikey',
    'api_key',
    'api-key',
    'token',
    'secret',
    'password',
    'passwd',
    'authorization',
    'credential',
    'bearer',
    'privatekey',
    'private_key',
    'cookie',
];

/**
 * Prefix-based token shapes redacted on top of the detection patterns. Detection pins
 * exact lengths so legitimate diffs are not blocked; redaction can afford to be
 * broader, so longer or newer variants of these tokens are still masked.
 */
const BROAD_TOKEN_SHAPES =
    /\b(?:sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{22,}|(?:glpat|glrt)-[A-Za-z0-9_-]{20,})/g;

const BEARER_CREDENTIAL = /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/gi;

/**
 * Check whether a field name denotes a credential-bearing value.
 *
 * @param key - Object key or header name
 * @returns True when values stored under this name must never be emitted
 */
export function isSensitiveFieldName(key: string): boolean {
    const lower = key.toLowerCase();
    return SENSITIVE_FIELD_MARKERS.some((marker) => lower.includes(marker));
}

function redactUrlCredentials(value: string): string {
    return value
        .replace(/(:\/\/)([^/\s:@]+):([^@\s/]+)@/g, `$1$2:${REDACTED}@`)
        .replace(/(:\/\/)([^/\s:@]+)@/g, `$1${REDACTED}@`);
}

/**
 * Redact URL credentials, bearer tokens, and every known secret value format.
 *
 * @param value - Free text such as a log message, error message, or stack
 * @returns The text with credentials replaced by `[REDACTED]`
 */
export function redactSecrets(value: string): string {
    const withoutUrlCredentials =
        value.includes('://') && value.includes('@') ? redactUrlCredentials(value) : value;
    return redactPotentialSecrets(withoutUrlCredentials, REDACTED)
        .replace(BROAD_TOKEN_SHAPES, REDACTED)
        .replace(BEARER_CREDENTIAL, `Bearer ${REDACTED}`);
}

/**
 * `JSON.stringify` replacer that redacts string values under sensitive field names
 * and secret-looking substrings in every other string value.
 *
 * @param key - Property name supplied by JSON.stringify ('' for the root)
 * @param value - Property value
 * @returns The value to serialize
 */
export function redactSensitiveJsonValue(key: string, value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }
    if (key !== '' && isSensitiveFieldName(key)) {
        return REDACTED;
    }
    return redactSecrets(value);
}
