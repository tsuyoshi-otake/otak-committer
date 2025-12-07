/**
 * Error handling utilities for commit message generation
 *
 * **Feature: commit-message-generation-robustness**
 * **Property 9: Error message clarity**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 */

/**
 * Error context for commit operations
 */
export interface ErrorContext {
    /** The operation that failed */
    operation: string;
    /** Additional details about the error */
    details?: {
        fileCount?: number;
        tokenCount?: number;
        errorType?: string;
        apiError?: any;
    };
}

/**
 * Result of handling an error
 */
export interface ErrorHandlerResult {
    /** Formatted error message for display */
    message: string;
    /** Whether the error is recoverable */
    isRecoverable: boolean;
    /** Suggested action for the user */
    suggestedAction?: string;
}

/**
 * Error codes for commit operations
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
 * Custom error class for commit operations
 */
export class CommitError extends Error {
    public readonly code: CommitErrorCode;
    public readonly context?: ErrorContext;

    constructor(message: string, code: CommitErrorCode, context?: ErrorContext) {
        super(message);
        this.name = 'CommitError';
        this.code = code;
        this.context = context;
    }
}

/**
 * Create an error context object
 *
 * @param operation - The operation name
 * @param details - Additional details
 * @returns ErrorContext object
 */
export function createErrorContext(
    operation: string,
    details?: ErrorContext['details']
): ErrorContext {
    return {
        operation,
        details: details ? { ...details } : undefined
    };
}

/**
 * Format an error message with context for display
 *
 * @param error - The error that occurred
 * @param context - Error context
 * @returns Formatted error message
 *
 * **Property 9: Error message clarity**
 */
export function formatErrorMessage(
    error: Error | CommitError | unknown,
    context: ErrorContext
): string {
    const parts: string[] = [];

    // Add operation context
    parts.push(`Error during ${context.operation}`);

    // Add error message
    if (error instanceof Error) {
        parts.push(`: ${error.message}`);
    } else if (typeof error === 'string') {
        parts.push(`: ${error}`);
    }

    // Add details if available
    if (context.details) {
        const detailParts: string[] = [];

        if (context.details.fileCount !== undefined) {
            detailParts.push(`files: ${context.details.fileCount}`);
        }

        if (context.details.tokenCount !== undefined) {
            const kTokens = Math.round(context.details.tokenCount / 1000);
            detailParts.push(`tokens: ${kTokens}K`);
        }

        if (context.details.errorType) {
            detailParts.push(`type: ${context.details.errorType}`);
        }

        if (context.details.apiError?.status) {
            detailParts.push(`status: ${context.details.apiError.status}`);
        }

        if (detailParts.length > 0) {
            parts.push(` (${detailParts.join(', ')})`);
        }
    }

    return parts.join('');
}

/**
 * Check if an error is an API key error
 *
 * @param error - The error to check
 * @returns true if it's an API key error
 */
export function isApiKeyError(error: Error | CommitError): boolean {
    if (error instanceof CommitError) {
        return error.code === 'INVALID_API_KEY' || error.code === 'MISSING_API_KEY';
    }

    const message = error.message.toLowerCase();
    return (
        message.includes('api key') ||
        message.includes('unauthorized') ||
        message.includes('authentication')
    );
}

/**
 * Check if an error is a network error
 *
 * @param error - The error to check
 * @returns true if it's a network error
 */
export function isNetworkError(error: Error | CommitError): boolean {
    if (error instanceof CommitError) {
        return error.code === 'NETWORK_ERROR' || error.code === 'RATE_LIMIT';
    }

    const message = error.message.toLowerCase();
    return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('rate limit')
    );
}

/**
 * Check if an error is a diff-related error
 *
 * @param error - The error to check
 * @returns true if it's a diff error
 */
export function isDiffError(error: Error | CommitError): boolean {
    if (error instanceof CommitError) {
        return error.code === 'DIFF_ERROR' || error.code === 'FILE_ACCESS_ERROR';
    }

    const message = error.message.toLowerCase();
    return (
        message.includes('diff') ||
        message.includes('git') ||
        message.includes('file') ||
        message.includes('repository')
    );
}

/**
 * Check if an error indicates empty diff
 *
 * @param error - The error to check
 * @returns true if it's an empty diff error
 */
export function isEmptyDiffError(error: Error | CommitError): boolean {
    if (error instanceof CommitError) {
        return error.code === 'EMPTY_DIFF';
    }

    const message = error.message.toLowerCase();
    return (
        message.includes('no changes') ||
        message.includes('empty') ||
        message.includes('nothing to commit')
    );
}

/**
 * Handle a commit error and return structured result
 *
 * @param error - The error to handle
 * @param context - Error context
 * @returns ErrorHandlerResult with message and recovery info
 */
export function handleCommitError(
    error: Error | CommitError,
    context: ErrorContext
): ErrorHandlerResult {
    const message = formatErrorMessage(error, context);

    // Determine if error is recoverable
    let isRecoverable = false;
    let suggestedAction: string | undefined;

    if (isApiKeyError(error)) {
        isRecoverable = true;
        suggestedAction = 'Please configure your API key in the extension settings.';
    } else if (isNetworkError(error)) {
        isRecoverable = true;
        suggestedAction = 'Please check your network connection and try again.';
    } else if (isEmptyDiffError(error)) {
        isRecoverable = false;
        suggestedAction = 'Stage some changes before generating a commit message.';
    } else if (isDiffError(error)) {
        isRecoverable = false;
        suggestedAction = 'Ensure you are in a valid Git repository with staged changes.';
    }

    return {
        message,
        isRecoverable,
        suggestedAction
    };
}

/**
 * Log error details for debugging
 *
 * @param error - The error to log
 * @param context - Error context
 */
export function logErrorDetails(
    error: Error | CommitError,
    context: ErrorContext
): void {
    console.error('Commit Error Details:', {
        operation: context.operation,
        message: error.message,
        code: error instanceof CommitError ? error.code : 'UNKNOWN',
        stack: error.stack,
        details: context.details
    });
}
