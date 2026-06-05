import * as vscode from 'vscode';
import { BaseCommand } from '../BaseCommand';
import { Logger } from '../../infrastructure/logging/Logger';
import { ConfigManager } from '../../infrastructure/config/ConfigManager';
import { StorageManager } from '../../infrastructure/storage/StorageManager';
import { ErrorHandler } from '../../infrastructure/error/ErrorHandler';
import { createMockExtensionContext } from './commandRegistryTestHelpers';

export { createMockExtensionContext };

export class TestCommand extends BaseCommand {
    public executeCalled = false;
    public executeArgs: any[] = [];

    async execute(...args: any[]): Promise<void> {
        this.executeCalled = true;
        this.executeArgs = args;
    }

    public getLogger(): Logger {
        return this.logger;
    }

    public getConfig(): ConfigManager {
        return this.config;
    }

    public getStorage(): StorageManager {
        return this.storage;
    }

    public getContext(): vscode.ExtensionContext {
        return this.context;
    }

    public async testWithProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
        return this.withProgress(title, task);
    }

    public testHandleError(error: unknown, operation: string): void {
        this.handleErrorSilently(error, operation);
    }
}

export interface ProgressMock {
    progressCalls: Array<{
        title: string;
        location: vscode.ProgressLocation | { viewId: string };
    }>;
    restore: () => void;
}

export interface ErrorHandlerMock {
    handledErrors: Array<{ error: unknown; context: any }>;
    restore: () => void;
}

export function installProgressMock(): ProgressMock {
    const progressCalls: ProgressMock['progressCalls'] = [];
    const originalWithProgress = vscode.window.withProgress;

    (vscode.window as any).withProgress = async (
        options: vscode.ProgressOptions,
        task: (progress: vscode.Progress<any>) => Thenable<any>,
    ) => {
        progressCalls.push({
            title: options.title || '',
            location: options.location,
        });

        const mockProgress = {
            report: () => {},
        };
        return await task(mockProgress);
    };

    return {
        progressCalls,
        restore: () => {
            vscode.window.withProgress = originalWithProgress;
            progressCalls.splice(0, progressCalls.length);
        },
    };
}

export function installErrorHandlerMock(): ErrorHandlerMock {
    const handledErrors: ErrorHandlerMock['handledErrors'] = [];
    const originalHandle = ErrorHandler.handle;

    (ErrorHandler as any).handle = (error: unknown, context: any) => {
        handledErrors.push({ error, context });
    };

    return {
        handledErrors,
        restore: () => {
            ErrorHandler.handle = originalHandle;
            handledErrors.splice(0, handledErrors.length);
        },
    };
}
