/**
 * Error severity levels for determining how to handle and display errors
 */
export enum ErrorSeverity {
    Info = 'info',
    Warning = 'warning',
    Error = 'error',
    Critical = 'critical',
}

/**
 * Base error class for all extension errors
 * Provides consistent error handling with error codes and context
 */
export abstract class BaseError extends Error {
    /** Severity level for this error type */
    abstract readonly severity: ErrorSeverity;

    /**
     * Creates a new BaseError
     * @param message - Human-readable error message
     * @param code - Error code for categorization
     * @param context - Additional context information
     */
    constructor(
        message: string,
        public readonly code: string,
        public readonly context?: Record<string, unknown>,
    ) {
        super(message);
        this.name = this.constructor.name;

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Returns the error name, code, and message
     *
     * Context is intentionally not serialized here: it may hold credentials, and the
     * redaction rules live above this layer. Use `formatErrorDetail` from
     * infrastructure/error to render an error together with its redacted context.
     */
    public toString(): string {
        return `${this.name} [${this.code}]: ${this.message}`;
    }
}
