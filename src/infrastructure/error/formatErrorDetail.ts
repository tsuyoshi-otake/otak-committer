import { BaseError } from '../../types/errors/BaseError';
import { redactSensitiveJsonValue } from '../../utils/secretRedaction';

/**
 * Render an error as one line of text for logs and notifications.
 *
 * Extension errors include their context, redacted with the same rules as log
 * output: string values under credential-like field names and secret-looking
 * substrings anywhere else are replaced by `[REDACTED]`.
 *
 * @param error - Any thrown value
 * @returns `Name [CODE]: message | Context: {...}` for extension errors,
 *   the message for other Errors, and `String(error)` otherwise
 */
export function formatErrorDetail(error: unknown): string {
    if (error instanceof BaseError) {
        return error.context
            ? `${error.toString()} | Context: ${JSON.stringify(error.context, redactSensitiveJsonValue)}`
            : error.toString();
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
