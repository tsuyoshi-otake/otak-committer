/**
 * Base error class for all extension errors
 * Provides consistent error handling with error codes and context
 */
export abstract class BaseError extends Error {
    /**
     * Creates a new BaseError
     * @param message - Human-readable error message
     * @param code - Error code for categorization
     * @param context - Additional context information
     */
    constructor(
        message: string,
        public readonly code: string,
        public readonly context?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
        
        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Returns a formatted error message with code and context
     */
    public toString(): string {
        const contextStr = this.context 
            ? ` | Context: ${JSON.stringify(this.context)}`
            : '';
        return `${this.name} [${this.code}]: ${this.message}${contextStr}`;
    }
}
