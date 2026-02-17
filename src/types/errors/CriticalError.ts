import { BaseError, ErrorSeverity } from './BaseError';

/**
 * Error thrown for critical failures that require immediate attention
 * These errors typically indicate system-level issues that prevent normal operation
 */
export class CriticalError extends BaseError {
    readonly severity = ErrorSeverity.Critical;

    constructor(message: string, context?: Record<string, unknown>) {
        super(message, 'CRITICAL_ERROR', context);
    }
}
