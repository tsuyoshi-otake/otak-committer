import { BaseError } from './BaseError';

/**
 * Error thrown when storage operations fail
 * Used for SecretStorage, Configuration, and GlobalState operations
 */
export class StorageError extends BaseError {
    /**
     * Creates a new StorageError
     * @param message - Description of the storage failure
     * @param context - Additional context (e.g., key name, operation type)
     */
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
