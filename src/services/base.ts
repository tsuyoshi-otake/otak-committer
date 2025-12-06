import { ServiceConfig } from '../types';
import { getServiceConfig, showConfigurationPrompt } from '../utils';
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
     * Ensure a configuration value is set, prompting user if necessary
     * 
     * @param key - The configuration key to check
     * @param promptMessage - Message to show if configuration is missing
     * @returns True if configuration is set, false otherwise
     */
    protected async ensureConfig(key: keyof ServiceConfig, promptMessage: string): Promise<boolean> {
        if (!this.config[key]) {
            const settingKey = `otakCommitter.${key}`;
            const configured = await showConfigurationPrompt(promptMessage, settingKey);
            if (configured) {
                this.config = getServiceConfig();
            }
            return !!this.config[key];
        }
        return true;
    }

    /**
     * Handle an error and rethrow it
     * 
     * Routes the error through centralized error handling before rethrowing.
     * 
     * @param error - The error to handle
     * @throws Always throws the error after handling
     */
    protected handleError(error: any): never {
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
    protected showError(message: string, error?: any): void {
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

    /**
     * Validate that all required service dependencies are available
     * 
     * @param services - Array of service instances to validate
     * @returns True if all services are defined, false otherwise
     */
    protected async validateDependencies(...services: (BaseService | undefined)[]): Promise<boolean> {
        for (const service of services) {
            if (!service) {
                return false;
            }
        }
        return true;
    }

    /**
     * Handle initialization errors
     * 
     * Routes errors through centralized error handling and returns undefined.
     * 
     * @param error - The error that occurred
     * @param message - Description of the initialization operation
     * @returns Always returns undefined
     */
    protected handleInitError(error: any, message: string): undefined {
        ErrorHandler.handle(error, {
            operation: message,
            component: this.constructor.name
        });
        return undefined;
    }
}