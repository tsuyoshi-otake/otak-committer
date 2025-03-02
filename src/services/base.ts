import * as vscode from 'vscode';
import { ServiceConfig } from '../types';
import { getServiceConfig, handleServiceError, showConfigurationPrompt } from '../utils';

export abstract class BaseService {
    protected config: ServiceConfig;

    constructor(config?: Partial<ServiceConfig>) {
        this.config = {
            ...getServiceConfig(),
            ...config
        };
    }

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

    protected handleError(error: any): never {
        handleServiceError(error);
    }

    protected showError(message: string, error?: any): void {
        const errorMessage = error ? `${message}: ${error.message}` : message;
        vscode.window.showErrorMessage(errorMessage);
        console.error(message, error);
    }

    protected validateState(condition: boolean, message: string): asserts condition {
        if (!condition) {
            throw new Error(message);
        }
    }

    // リソース解放が必要な場合のために用意
    public async dispose(): Promise<void> {
        // 継承先で必要に応じてオーバーライド
    }
}

export interface ServiceFactory<T extends BaseService> {
    create(config?: Partial<ServiceConfig>): Promise<T>;
}

export abstract class BaseServiceFactory<T extends BaseService> implements ServiceFactory<T> {
    abstract create(config?: Partial<ServiceConfig>): Promise<T>;

    protected async validateDependencies(...services: (BaseService | undefined)[]): Promise<boolean> {
        for (const service of services) {
            if (!service) {
                return false;
            }
        }
        return true;
    }

    protected handleInitError(error: any, message: string): undefined {
        console.error(message, error);
        vscode.window.showErrorMessage(`${message}: ${error.message}`);
        return undefined;
    }
}