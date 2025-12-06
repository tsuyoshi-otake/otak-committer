import { BaseError } from './BaseError';

/**
 * Error thrown when a service operation fails
 * Used for external API calls, Git operations, etc.
 */
export class ServiceError extends BaseError {
    /**
     * Creates a new ServiceError
     * @param message - Description of the service failure
     * @param service - Name of the service that failed (e.g., 'OpenAI', 'GitHub', 'Git')
     * @param context - Additional context (e.g., status code, request details)
     */
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
