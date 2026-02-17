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

    private static readonly SENSITIVE_KEYS = new Set([
        'apikey',
        'api_key',
        'token',
        'secret',
        'password',
        'authorization',
        'credential',
        'openaiApiKey',
        'githubToken',
    ]);

    /**
     * Returns a formatted error message with code and sanitized context
     */
    public toString(): string {
        const contextStr = this.context
            ? ` | Context: ${JSON.stringify(this.context, (key, value) => {
                  if (typeof key === 'string' && BaseError.SENSITIVE_KEYS.has(key.toLowerCase())) {
                      return typeof value === 'string' ? '[REDACTED]' : value;
                  }
                  return value;
              })}`
            : '';
        return `${this.name} [${this.code}]: ${this.message}${contextStr}`;
    }
}
