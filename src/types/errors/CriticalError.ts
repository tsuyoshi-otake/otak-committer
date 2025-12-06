import { BaseError } from './BaseError';

/**
 * Error thrown for critical failures that require immediate attention
 * These errors typically indicate system-level issues that prevent normal operation
 */
export class CriticalError extends BaseError {
    /**
     * Creates a new CriticalError
     * @param message - Description of the critical failure
     * @param context - Additional context
     */
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'CRITICAL_ERROR', context);
    }
}
