/**
 * Canonical OpenAI API base URL used when no override is configured.
 */
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

/**
 * Error raised when a configured OpenAI base URL violates the connection policy.
 */
export class OpenAIBaseUrlError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OpenAIBaseUrlError';
    }
}

function trimOptional(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

function normalizeHostname(hostname: string): string {
    return hostname.toLowerCase().replace(/^\[|\]$/g, '');
}

function isLoopbackHostname(hostname: string): boolean {
    const normalized = normalizeHostname(hostname);
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

/**
 * Resolve and validate the base URL used for all OpenAI API requests.
 *
 * The configured value wins over OPENAI_BASE_URL. The caller passes the
 * environment value explicitly so tests cannot accidentally inherit it.
 */
export function resolveOpenAIBaseUrl(configuredValue?: string, environmentValue?: string): string {
    const candidate =
        trimOptional(configuredValue) ?? trimOptional(environmentValue) ?? DEFAULT_OPENAI_BASE_URL;

    let url: URL;
    try {
        url = new URL(candidate);
    } catch {
        throw new OpenAIBaseUrlError('OpenAI base URL must be an absolute URL');
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new OpenAIBaseUrlError('OpenAI base URL must use HTTPS or loopback HTTP');
    }
    if (url.username || url.password) {
        throw new OpenAIBaseUrlError('OpenAI base URL must not contain credentials');
    }
    if (url.search || url.hash) {
        throw new OpenAIBaseUrlError('OpenAI base URL must not contain a query or fragment');
    }
    if (url.protocol === 'http:' && !isLoopbackHostname(url.hostname)) {
        throw new OpenAIBaseUrlError('Plain HTTP is allowed only for localhost loopback URLs');
    }

    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString().replace(/\/$/, '');
}

/**
 * Return whether a normalized base URL is the canonical OpenAI API endpoint.
 */
export function isOfficialOpenAIBaseUrl(baseURL: string): boolean {
    return resolveOpenAIBaseUrl(baseURL) === DEFAULT_OPENAI_BASE_URL;
}

/**
 * Stable credentials and endpoint identity shared by validation and generation.
 */
export interface OpenAIConnectionContext {
    apiKey: string;
    baseURL: string;
    isOfficial: boolean;
}

/**
 * Create a normalized connection context from a credential and endpoint sources.
 */
export function createOpenAIConnectionContext(
    apiKey: string,
    configuredBaseURL?: string,
    environmentBaseURL?: string,
): OpenAIConnectionContext {
    const trimmedApiKey = apiKey.trim();
    if (!trimmedApiKey) {
        throw new Error('OpenAI API key is required');
    }

    const baseURL = resolveOpenAIBaseUrl(configuredBaseURL, environmentBaseURL);
    return {
        apiKey: trimmedApiKey,
        baseURL,
        isOfficial: isOfficialOpenAIBaseUrl(baseURL),
    };
}
