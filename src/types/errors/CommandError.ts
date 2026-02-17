import { BaseError, ErrorSeverity } from './BaseError';

/**
 * Error thrown when a command execution fails
 * Used for VS Code command operations
 */
export class CommandError extends BaseError {
    readonly severity = ErrorSeverity.Error;

    constructor(
        message: string,
        public readonly commandId: string,
        context?: Record<string, any>
    ) {
        super(message, 'COMMAND_ERROR', { ...context, commandId });
    }
}
