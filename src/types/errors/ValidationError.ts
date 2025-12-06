import { BaseError } from './BaseError';

/**
 * Error thrown when validation fails
 * Used for input validation, configuration validation, etc.
 */
export class ValidationError extends BaseError {
    /**
     * Creates a new ValidationError
     * @param message - Description of the validation failure
     * @param context - Additional context (e.g., field name, expected format)
     */
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'VALIDATION_ERROR', context);
    }
}
