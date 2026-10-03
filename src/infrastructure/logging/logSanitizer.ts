import { redactSecrets, redactSensitiveJsonValue } from '../../utils/secretRedaction';

/**
 * Redact known secret patterns and URL credentials from a log message string
 *
 * @param value - The raw string to sanitize
 * @returns The string with detected secrets replaced by [REDACTED]
 */
export function sanitizeLogMessage(value: string): string {
    return redactSecrets(value);
}

/**
 * Sanitize an arbitrary log argument by redacting secrets in strings, Errors, and object fields
 *
 * @param arg - The value to sanitize before passing it to a log sink
 * @returns A sanitized representation safe to write to logs
 */
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
        return JSON.parse(JSON.stringify(sanitized, redactSensitiveJsonValue));
    } catch {
        return '[Unserializable log argument]';
    }
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
