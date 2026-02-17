import { BaseError, ErrorSeverity } from './BaseError';

/**
 * Error thrown when validation fails
 * Used for input validation, configuration validation, etc.
 */
export class ValidationError extends BaseError {
    readonly severity = ErrorSeverity.Warning;

    constructor(message: string, context?: Record<string, any>) {
        super(message, 'VALIDATION_ERROR', context);
    }
}
