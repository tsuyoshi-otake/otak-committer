import OpenAI from 'openai';

export type ValidationKind = 'auth' | 'rate_limit' | 'network' | 'server' | 'unknown';

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

export async function validateApiKey(apiKey: string): Promise<ValidateApiKeyResult> {
    try {
        const client = new OpenAI({ apiKey });
        await client.models.list();
        return { ok: true };
    } catch (error) {
        const status = getErrorStatus(error);
        const reason = redactApiKey(getErrorMessage(error) || 'Unknown error', apiKey);
        const retryAfterSeconds = getRetryAfterSeconds(error);

        if (status === 401) {
            return { ok: false, kind: 'auth', status, reason };
        }
        if (status === 429) {
            return { ok: false, kind: 'rate_limit', status, reason, retryAfterSeconds };
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
