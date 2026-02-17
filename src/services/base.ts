import { ServiceConfig } from '../types';
import { getServiceConfig } from '../utils';
import { Logger } from '../infrastructure/logging';
import { ErrorHandler } from '../infrastructure/error';

/**
 * Abstract base class for all services
 * 
 * Provides common functionality including configuration management,
 * error handling, and logging for all service implementations.
 * 
 * @example
 * ```typescript
 * export class MyService extends BaseService {
 *   constructor(config?: Partial<ServiceConfig>) {
 *     super(config);
 *   }
 * }
 * ```
 */
export abstract class BaseService {
    protected config: ServiceConfig;
    protected logger: Logger;

    constructor(config?: Partial<ServiceConfig>) {
        this.config = {
            ...getServiceConfig(),
            ...config
        };
        this.logger = Logger.getInstance();
    }

    /**
     * Handle an error and rethrow it
     * 
     * Routes the error through centralized error handling before rethrowing.
     * 
     * @param error - The error to handle
     * @throws Always throws the error after handling
     */
    protected handleErrorAndRethrow(error: unknown): never {
        ErrorHandler.handle(error, {
            operation: 'Service operation',
            component: this.constructor.name
        });
        throw error;
    }

    /**
     * Show an error to the user without throwing
     * 
     * @param message - The error message
     * @param error - Optional error object
     */
    protected showError(message: string, error?: unknown): void {
        ErrorHandler.handle(error || new Error(message), {
            operation: message,
            component: this.constructor.name
        });
    }

    /**
     * Validate a condition and throw if false
     * 
     * TypeScript assertion function that narrows types when condition is true.
     * 
     * @param condition - The condition to validate
     * @param message - Error message if condition is false
     * @throws Error if condition is false
     */
    protected validateState(condition: boolean, message: string): asserts condition {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * Dispose of service resources
     * 
     * Override this method in subclasses to clean up resources.
     */
    public async dispose(): Promise<void> {
        // Override in subclasses if needed
    }
}

/**
 * Interface for service factories
 */
export interface ServiceFactory<T extends BaseService> {
    /** Create a service instance with optional configuration */
    create(config?: Partial<ServiceConfig>): Promise<T>;
}

/**
 * Abstract base class for service factories
 * 
 * Provides common functionality for creating and initializing services.
 * 
 * @example
 * ```typescript
 * export class MyServiceFactory extends BaseServiceFactory<MyService> {
 *   async create(config?: Partial<ServiceConfig>): Promise<MyService> {
 *     return new MyService(config);
 *   }
 * }
 * ```
 */
export abstract class BaseServiceFactory<T extends BaseService> implements ServiceFactory<T> {
    protected logger: Logger;

    constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Create a service instance
     * 
     * Must be implemented by subclasses to create the specific service type.
     * 
     * @param config - Optional service configuration
     * @returns The created service instance
     */
    abstract create(config?: Partial<ServiceConfig>): Promise<T>;

}