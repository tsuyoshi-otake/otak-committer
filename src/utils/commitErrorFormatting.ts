import { CommitError, CommitErrorContext } from './commitErrorTypes';

/**
 * Format an error message with context for display.
 */
export function formatErrorMessage(
    error: Error | CommitError | unknown,
    context: CommitErrorContext,
): string {
    const parts: string[] = [];

    parts.push(`Error during ${context.operation}`);

    if (error instanceof Error) {
        parts.push(`: ${error.message}`);
    } else if (typeof error === 'string') {
        parts.push(`: ${error}`);
    }

    if (context.details) {
        const detailParts = formatErrorDetails(context);

        if (detailParts.length > 0) {
            parts.push(` (${detailParts.join(', ')})`);
        }
    }

    return parts.join('');
}

function formatErrorDetails(context: CommitErrorContext): string[] {
    const detailParts: string[] = [];

    if (context.details?.fileCount !== undefined) {
        detailParts.push(`files: ${context.details.fileCount}`);
    }

    if (context.details?.tokenCount !== undefined) {
        const kTokens = Math.round(context.details.tokenCount / 1000);
        detailParts.push(`tokens: ${kTokens}K`);
    }

    if (context.details?.errorType) {
        detailParts.push(`type: ${context.details.errorType}`);
    }

    const apiStatus = getApiErrorStatus(context.details?.apiError);
    if (apiStatus !== undefined) {
        detailParts.push(`status: ${apiStatus}`);
    }

    return detailParts;
}

function getApiErrorStatus(apiError: unknown): number | undefined {
    if (typeof apiError !== 'object' || apiError === null) {
        return undefined;
    }

    if ('status' in apiError) {
        const status = (apiError as { status?: unknown }).status;
        if (typeof status === 'number') {
            return status;
        }
    }

    return undefined;
}
