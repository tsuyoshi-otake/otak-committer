import { CommitError, CommitErrorContext, ErrorHandlerResult } from './commitErrorTypes';
import { formatErrorMessage } from './commitErrorFormatting';
import { isApiKeyError, isDiffError, isEmptyDiffError, isNetworkError } from './errorGuards';

/**
 * Handle a commit error and return structured result.
 */
export function handleCommitError(
    error: Error | CommitError,
    context: CommitErrorContext,
): ErrorHandlerResult {
    const message = formatErrorMessage(error, context);

    let isRecoverable = false;
    let suggestedAction: string | undefined;

    if (isApiKeyError(error)) {
        isRecoverable = true;
        suggestedAction = 'Please configure your API key in the extension settings.';
    } else if (isNetworkError(error)) {
        isRecoverable = true;
        suggestedAction = 'Please check your network connection and try again.';
    } else if (isEmptyDiffError(error)) {
        suggestedAction = 'Stage some changes before generating a commit message.';
    } else if (isDiffError(error)) {
        suggestedAction = 'Ensure you are in a valid Git repository with staged changes.';
    }

    return {
        message,
        isRecoverable,
        suggestedAction,
    };
}

/**
 * Log error details for debugging.
 */
export function logErrorDetails(error: Error | CommitError, context: CommitErrorContext): void {
    console.error('Commit Error Details:', {
        operation: context.operation,
        message: error.message,
        code: error instanceof CommitError ? error.code : 'UNKNOWN',
        stack: error.stack,
        details: context.details,
    });
}
