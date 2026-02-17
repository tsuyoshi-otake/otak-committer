import { BaseError, ErrorSeverity } from './BaseError';

/**
 * Error thrown when a service operation fails
 * Used for external API calls, Git operations, etc.
 */
export class ServiceError extends BaseError {
    readonly severity = ErrorSeverity.Error;

    constructor(
        message: string,
        public readonly service: string,
        context?: Record<string, any>
    ) {
        super(message, 'SERVICE_ERROR', { ...context, service });
    }
}

/**
 * Error thrown when OpenAI API operations fail
 */
export class OpenAIServiceError extends ServiceError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'OpenAI', context);
    }
}

/**
 * Error thrown when GitHub API operations fail
 */
export class GitHubServiceError extends ServiceError {
    constructor(
        message: string,
        public readonly status?: number,
        context?: Record<string, any>
    ) {
        super(message, 'GitHub', { ...context, status });
    }
}

/**
 * Error thrown when Git operations fail
 */
export class GitServiceError extends ServiceError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'Git', context);
    }
}
