import { BaseError, ErrorSeverity } from './BaseError';

/**
 * Error thrown when storage operations fail
 * Used for SecretStorage, Configuration, and GlobalState operations
 */
export class StorageError extends BaseError {
    readonly severity = ErrorSeverity.Error;

    constructor(message: string, context?: Record<string, any>) {
        super(message, 'STORAGE_ERROR', context);
    }
}

/**
 * Error thrown when SecretStorage operations fail
 */
export class SecretStorageError extends StorageError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, { ...context, storageType: 'SecretStorage' });
    }
}

/**
 * Error thrown when Configuration operations fail
 */
export class ConfigurationError extends StorageError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, { ...context, storageType: 'Configuration' });
    }
}
