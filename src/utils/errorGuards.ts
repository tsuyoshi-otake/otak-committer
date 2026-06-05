import { CommitError } from './commitErrorTypes';

/**
 * Check whether an error represents a user-initiated abort/cancellation.
 *
 * The OpenAI SDK throws APIUserAbortError with message "Request was aborted."
 * rather than a DOM AbortError, so check both forms.
 */
export function isUserAbortError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const candidate = error as {
        name?: unknown;
        message?: unknown;
        constructor?: { name?: string };
    };
    const name = typeof candidate.name === 'string' ? candidate.name : '';
    const message = typeof candidate.message === 'string' ? candidate.message : '';
    const constructorName = candidate.constructor?.name ?? '';

    return (
        name === 'AbortError' ||
        constructorName === 'APIUserAbortError' ||
        message === 'Request was aborted.' ||
        message === 'Request was aborted'
    );
}

/**
 * Check if an error is an API key error.
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
 * Check if an error is a network error.
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
 * Check if an error is a diff-related error.
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
 * Check if an error indicates empty diff.
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
