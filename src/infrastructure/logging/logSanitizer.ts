const SECRET_VALUE_PATTERNS = [
    /sk-(?:proj-|svcacct-|admin-|or-|ant-)?[A-Za-z0-9_-]{20,}/,
    /(?:ghp_|gho_|ghu_|ghs_)[A-Za-z0-9_]{36,}/,
    /(?:AKIA|ASIA)[0-9A-Z]{16}/,
    /(?:xoxb-|xoxp-|xoxs-|xapp-)[0-9A-Za-z-]{10,}/,
    /(?:glpat-|glrt-)[0-9A-Za-z_-]{20}/,
    /Bearer\s+[A-Za-z0-9._-]{20,}/i,
];

export function sanitizeLogMessage(value: string): string {
    let sanitized =
        value.includes('://') && value.includes('@') ? redactUrlCredentials(value) : value;

    for (const pattern of SECRET_VALUE_PATTERNS) {
        sanitized = sanitized.replace(
            new RegExp(pattern.source, pattern.flags + 'g'),
            '[REDACTED]',
        );
    }

    return sanitized;
}

export function sanitizeForLogging(arg: unknown): unknown {
    const sanitized = sanitizeLogArg(arg);
    if (
        sanitized === null ||
        sanitized === undefined ||
        typeof sanitized === 'string' ||
        typeof sanitized === 'number' ||
        typeof sanitized === 'boolean'
    ) {
        return sanitized;
    }

    try {
        return JSON.parse(JSON.stringify(sanitized, sensitiveFieldReplacer));
    } catch {
        return '[Unserializable log argument]';
    }
}

function redactUrlCredentials(value: string): string {
    return value
        .replace(/(:\/\/)([^/\s:@]+):([^@\s/]+)@/g, '$1$2:[REDACTED]@')
        .replace(/(:\/\/)([^/\s:@]+)@/g, '$1[REDACTED]@');
}

function sensitiveFieldReplacer(key: string, value: unknown): unknown {
    const lower = key.toLowerCase();
    if (
        lower.includes('apikey') ||
        lower.includes('api_key') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('password') ||
        lower.includes('authorization') ||
        lower.includes('credential') ||
        lower.includes('bearer')
    ) {
        return typeof value === 'string' ? '[REDACTED]' : value;
    }

    if (typeof value === 'string') {
        if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
            return '[REDACTED]';
        }
        if (value.includes('://') && value.includes('@')) {
            return redactUrlCredentials(value);
        }
    }
    return value;
}

function errorToLogObject(error: Error): Record<string, unknown> {
    const obj: Record<string, unknown> = {
        name: error.name,
        message: sanitizeLogMessage(error.message),
    };

    if (error.stack) {
        obj.stack = sanitizeLogMessage(error.stack);
    }

    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
        obj.cause = errorToLogObject(cause);
    } else if (cause !== undefined) {
        obj.cause = cause;
    }

    return obj;
}

function sanitizeLogArg(arg: unknown): unknown {
    if (arg instanceof Error) {
        return errorToLogObject(arg);
    }
    if (typeof arg === 'string') {
        return sanitizeLogMessage(arg);
    }
    return arg;
}
