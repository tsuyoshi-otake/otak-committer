import type OpenAI from 'openai';
import { createOpenAIClient } from './openaiClient';
import {
    createOpenAIConnectionContext,
    DEFAULT_OPENAI_BASE_URL,
    type OpenAIConnectionContext,
} from './openaiConnection';
import { OPENAI_VALIDATION_POLICY, type OpenAIRequestPolicy } from './openaiRequestPolicy';

/**
 * Category of API key validation failure
 */
export type ValidationKind =
    | 'auth'
    | 'rate_limit'
    | 'network'
    | 'server'
    | 'unsupported'
    | 'unknown';

/**
 * Result of an API key validation attempt, either success or a categorized failure
 */
export type ValidateApiKeyResult =
    | { ok: true }
    | {
          ok: false;
          kind: ValidationKind;
          status?: number;
          reason: string;
          retryAfterSeconds?: number;
      };

/** Maximum retry-after value to accept (1 hour) to prevent abuse via malicious headers */
const MAX_RETRY_AFTER_SECONDS = 3600;

function redactApiKey(message: string, apiKey: string): string {
    if (!message || !apiKey) {
        return message || '';
    }
    return message.split(apiKey).join('[REDACTED]');
}

function getErrorStatus(error: unknown): number | undefined {
    const status = (error as { status?: unknown } | null | undefined)?.status;
    if (typeof status === 'number') {
        return status;
    }

    const responseStatus = (error as { response?: { status?: unknown } } | null | undefined)
        ?.response?.status;
    if (typeof responseStatus === 'number') {
        return responseStatus;
    }

    return undefined;
}

function getErrorMessage(error: unknown): string {
    const fromBody = (error as { error?: { message?: unknown } } | null | undefined)?.error
        ?.message;
    if (typeof fromBody === 'string' && fromBody.trim()) {
        return fromBody;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function getRetryAfterSeconds(error: unknown): number | undefined {
    const headers =
        (error as { headers?: Record<string, unknown> } | null | undefined)?.headers ??
        (error as { response?: { headers?: Record<string, unknown> } } | null | undefined)?.response
            ?.headers;

    if (!headers) {
        return undefined;
    }

    const raw =
        (headers['retry-after'] as unknown) ??
        (headers['Retry-After'] as unknown) ??
        (headers['x-ratelimit-reset'] as unknown) ??
        (headers['X-RateLimit-Reset'] as unknown);

    if (typeof raw === 'number') {
        return raw >= 0 && raw <= MAX_RETRY_AFTER_SECONDS ? raw : undefined;
    }

    if (typeof raw === 'string') {
        const parsed = Number.parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_RETRY_AFTER_SECONDS) {
            return parsed;
        }
    }

    return undefined;
}

interface ValidationDependencies {
    client?: Pick<OpenAI, 'models'>;
    policy?: OpenAIRequestPolicy;
}

/**
 * Validate an OpenAI API key by issuing a lightweight authenticated request.
 *
 * @param apiKey - The API key to validate
 * @param baseURL - The normalized official or gateway API base URL
 * @param dependencies - Optional client and request policy used by deterministic tests
 * @returns A success result, or a categorized failure with status and reason
 */
export async function validateApiKey(
    apiKey: string,
    baseURL = DEFAULT_OPENAI_BASE_URL,
    dependencies: ValidationDependencies = {},
): Promise<ValidateApiKeyResult> {
    const connection = createOpenAIConnectionContext(apiKey, baseURL);
    const client = dependencies.client ?? createOpenAIClient(connection);
    const policy = dependencies.policy ?? OPENAI_VALIDATION_POLICY;

    try {
        await client.models.list(policy);
        return { ok: true };
    } catch (error) {
        const status = getErrorStatus(error);
        const reason = redactApiKey(
            getErrorMessage(error) || 'Unknown error',
            connection.apiKey,
        );
        const retryAfterSeconds = getRetryAfterSeconds(error);

        if (status === 401) {
            return { ok: false, kind: 'auth', status, reason };
        }
        if (status === 429) {
            return { ok: false, kind: 'rate_limit', status, reason, retryAfterSeconds };
        }
        if (!connection.isOfficial && (status === 404 || status === 405)) {
            return { ok: false, kind: 'unsupported', status, reason };
        }
        if (typeof status === 'number' && status >= 500) {
            return { ok: false, kind: 'server', status, reason, retryAfterSeconds };
        }
        if (status === undefined || status === 0) {
            return { ok: false, kind: 'network', status, reason };
        }

        return { ok: false, kind: 'unknown', status, reason, retryAfterSeconds };
    }
}

export type { OpenAIConnectionContext };
