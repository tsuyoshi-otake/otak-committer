/**
 * Error context for commit operations.
 */
export interface CommitErrorContext {
    operation: string;
    details?: {
        fileCount?: number;
        tokenCount?: number;
        errorType?: string;
        apiError?: unknown;
    };
}

/**
 * Result of handling an error.
 */
export interface ErrorHandlerResult {
    message: string;
    isRecoverable: boolean;
    suggestedAction?: string;
}

/**
 * Error codes for commit operations.
 */
export type CommitErrorCode =
    | 'DIFF_ERROR'
    | 'FILE_ACCESS_ERROR'
    | 'API_ERROR'
    | 'INVALID_API_KEY'
    | 'MISSING_API_KEY'
    | 'NETWORK_ERROR'
    | 'RATE_LIMIT'
    | 'EMPTY_DIFF'
    | 'UNKNOWN_ERROR';

/**
 * Custom error class for commit operations.
 */
export class CommitError extends Error {
    public readonly code: CommitErrorCode;
    public readonly context?: CommitErrorContext;

    constructor(message: string, code: CommitErrorCode, context?: CommitErrorContext) {
        super(message);
        this.name = 'CommitError';
        this.code = code;
        this.context = context;
    }
}

/**
 * Create an error context object.
 */
export function createCommitErrorContext(
    operation: string,
    details?: CommitErrorContext['details'],
): CommitErrorContext {
    return {
        operation,
        details: details ? { ...details } : undefined,
    };
}
