import { BaseError } from './BaseError';

/**
 * Error thrown when a command execution fails
 * Used for VS Code command operations
 */
export class CommandError extends BaseError {
    /**
     * Creates a new CommandError
     * @param message - Description of the command failure
     * @param commandId - ID of the command that failed
     * @param context - Additional context
     */
    constructor(
        message: string,
        public readonly commandId: string,
        context?: Record<string, any>
    ) {
        super(message, 'COMMAND_ERROR', { ...context, commandId });
    }
}
