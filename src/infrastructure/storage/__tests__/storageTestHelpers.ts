import * as vscode from 'vscode';

export interface StorageTestContext {
    context: vscode.ExtensionContext;
    storedSecrets: Map<string, string>;
    globalStateData: Map<string, any>;
}

interface FailingStorageContextOptions {
    secretGet?: (key: string) => Promise<string | undefined>;
    secretStore?: (key: string, value: string) => Promise<void>;
    secretDelete?: (key: string) => Promise<void>;
    stateGet?: (key: string) => any;
    stateUpdate?: (key: string, value: any) => Promise<void>;
}

interface MockWorkspaceConfigurationOptions {
    update?: (key: string, value: any, fullKey: string) => Promise<void>;
    has?: (key: string, fullKey: string) => boolean;
}

export function createStorageTestContext(): StorageTestContext {
    const storedSecrets = new Map<string, string>();
    const globalStateData = new Map<string, any>();

    const context = {
        secrets: {
            get: async (key: string) => storedSecrets.get(key),
            store: async (key: string, value: string) => {
                storedSecrets.set(key, value);
            },
            delete: async (key: string) => {
                storedSecrets.delete(key);
            },
        },
        globalState: {
            get: (key: string) => globalStateData.get(key),
            update: async (key: string, value: any) => {
                if (value === undefined) {
                    globalStateData.delete(key);
                } else {
                    globalStateData.set(key, value);
                }
            },
            keys: () => Array.from(globalStateData.keys()),
            setKeysForSync: (keys: readonly string[]) => {},
        },
    } as any;

    return { context, storedSecrets, globalStateData };
}

export function createFailingStorageContext(
    options: FailingStorageContextOptions = {},
): vscode.ExtensionContext {
    return {
        secrets: {
            get: options.secretGet ?? (async () => undefined),
            store: options.secretStore ?? (async () => {}),
            delete: options.secretDelete ?? (async () => {}),
        },
        globalState: {
            get: options.stateGet ?? (() => undefined),
            update: options.stateUpdate ?? (async () => {}),
            keys: () => [],
            setKeysForSync: () => {},
        },
    } as any;
}

/**
 * Replace `vscode.workspace.getConfiguration` with a map-backed fake.
 *
 * The replacement is global to the extension host, so callers must call the
 * returned function in `teardown`; otherwise later test files see this fake.
 *
 * @param configData - Backing store keyed by full setting name
 * @param options - Overrides for `update` and `has`
 * @returns A function that puts back the implementation seen before this call
 */
export function mockWorkspaceConfiguration(
    configData: Map<string, any>,
    options: MockWorkspaceConfigurationOptions = {},
): () => void {
    const previous = vscode.workspace.getConfiguration;
    (vscode.workspace as any).getConfiguration = (section?: string) => {
        return {
            get: (key: string) => configData.get(toFullConfigKey(section, key)),
            update: async (key: string, value: any) => {
                const fullKey = toFullConfigKey(section, key);

                if (options.update) {
                    await options.update(key, value, fullKey);
                    return;
                }

                if (value === undefined) {
                    configData.delete(fullKey);
                } else {
                    configData.set(fullKey, value);
                }
            },
            has: (key: string) => {
                const fullKey = toFullConfigKey(section, key);
                return options.has ? options.has(key, fullKey) : configData.has(fullKey);
            },
            inspect: () => undefined,
        };
    };
    return () => {
        (vscode.workspace as any).getConfiguration = previous;
    };
}

function toFullConfigKey(section: string | undefined, key: string): string {
    return section ? `${section}.${key}` : key;
}
