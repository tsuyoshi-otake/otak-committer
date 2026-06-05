import * as vscode from 'vscode';
import { ErrorHandler } from '../../infrastructure/error/ErrorHandler';

export interface CommandRegistryMocks {
    registeredCommands: Map<string, (...args: any[]) => any>;
    handledErrors: Array<{ error: unknown; context: any }>;
    restore: () => void;
}

export function createMockExtensionContext(): vscode.ExtensionContext {
    return {
        subscriptions: [],
        workspaceState: createMockMemento(),
        globalState: createMockMemento(),
        secrets: createMockSecretStorage(),
        extensionUri: vscode.Uri.file('/mock/extension/path'),
        extensionPath: '/mock/extension/path',
        asAbsolutePath: (relativePath: string) => `/mock/extension/path/${relativePath}`,
        storagePath: '/mock/storage/path',
        globalStoragePath: '/mock/global/storage/path',
        logPath: '/mock/log/path',
        extensionMode: vscode.ExtensionMode.Test,
        extension: {} as vscode.Extension<any>,
        environmentVariableCollection: {} as any,
        storageUri: vscode.Uri.file('/mock/storage/uri'),
        globalStorageUri: vscode.Uri.file('/mock/global/storage/uri'),
        logUri: vscode.Uri.file('/mock/log/uri'),
        languageModelAccessInformation: {} as any,
    } as unknown as vscode.ExtensionContext;
}

export function installCommandRegistryMocks(): CommandRegistryMocks {
    const registeredCommands = new Map<string, (...args: any[]) => any>();
    const handledErrors: Array<{ error: unknown; context: any }> = [];
    const originalRegisterCommand = vscode.commands.registerCommand;
    const originalErrorHandle = ErrorHandler.handle;

    (vscode.commands as any).registerCommand = (id: string, handler: (...args: any[]) => any) => {
        registeredCommands.set(id, handler);
        return { dispose: () => {} };
    };

    (ErrorHandler as any).handle = (error: unknown, context: any) => {
        handledErrors.push({ error, context });
    };

    return {
        registeredCommands,
        handledErrors,
        restore: () => {
            vscode.commands.registerCommand = originalRegisterCommand;
            ErrorHandler.handle = originalErrorHandle;
            registeredCommands.clear();
            handledErrors.splice(0, handledErrors.length);
        },
    };
}

function createMockSecretStorage(): vscode.SecretStorage {
    const secretStore = new Map<string, string>();

    return {
        get: async (key: string) => secretStore.get(key),
        store: async (key: string, value: string) => {
            secretStore.set(key, value);
        },
        delete: async (key: string) => {
            secretStore.delete(key);
        },
        onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event,
    };
}

function createMockMemento(): vscode.Memento & { setKeysForSync(keys: readonly string[]): void } {
    const store = new Map<string, any>();

    return {
        keys: () => Array.from(store.keys()),
        get: <T>(key: string, defaultValue?: T) => {
            return store.has(key) ? store.get(key) : defaultValue;
        },
        update: async (key: string, value: any) => {
            if (value === undefined) {
                store.delete(key);
            } else {
                store.set(key, value);
            }
        },
        setKeysForSync: (keys: readonly string[]) => {},
    };
}
