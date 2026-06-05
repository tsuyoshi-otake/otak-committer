import * as assert from 'assert';
import Module = require('module');
import { t } from '../../i18n';

type ModuleLoad = (request: string, parent: NodeModule | null, isMain: boolean) => unknown;

interface ApiKeyFlowModule {
    promptAndSaveApiKey(input: {
        logger: { info(message: string): void };
        storage: { setApiKey(service: string, key: string): Promise<void> };
        promptForApiKey(): Promise<string | undefined>;
        validateKeyFormat(key: string): boolean;
        validateWithProgress(apiKey: string): Promise<{
            isValid: boolean;
            status?: number;
            error?: string;
        }>;
    }): Promise<void>;
    validateCurrentApiKey(input: {
        storage: { getApiKey(service: string): Promise<string | undefined> };
        promptAndSaveApiKey(): Promise<void>;
        validateWithProgress(apiKey: string): Promise<{
            isValid: boolean;
            status?: number;
            error?: string;
        }>;
        maxValidationRetries: number;
    }): Promise<void>;
}

const moduleLoader = Module as unknown as { _load: ModuleLoad };

suite('API Key Flow', () => {
    let originalLoad: ModuleLoad;
    let apiKeyFlow: ApiKeyFlowModule;
    let infoMessages: string[];
    let warningResponses: Array<string | undefined>;
    let errorResponses: Array<string | undefined>;

    setup(() => {
        originalLoad = moduleLoader._load;
        infoMessages = [];
        warningResponses = [];
        errorResponses = [];

        const vscodeStub = {
            window: {
                showInformationMessage: async (message: string) => {
                    infoMessages.push(message);
                    return message === t('apiKey.validatePrompt') ? t('buttons.yes') : undefined;
                },
                showWarningMessage: async (_message: string, ...items: string[]) =>
                    warningResponses.shift() ?? items[0],
                showErrorMessage: async (_message: string, ...items: string[]) =>
                    errorResponses.shift() ?? items[0],
            },
        };

        moduleLoader._load = (request, parent, isMain) => {
            if (request === 'vscode') {
                return vscodeStub;
            }
            return originalLoad(request, parent, isMain);
        };

        delete require.cache[require.resolve('../apiKey.flow')];
        apiKeyFlow = require('../apiKey.flow') as ApiKeyFlowModule;
    });

    teardown(() => {
        moduleLoader._load = originalLoad;
        delete require.cache[require.resolve('../apiKey.flow')];
    });

    test('should save a valid key after successful validation', async () => {
        const savedKeys: string[] = [];
        const logMessages: string[] = [];

        await apiKeyFlow.promptAndSaveApiKey({
            logger: { info: (message) => logMessages.push(message) },
            storage: {
                setApiKey: async (service, key) => {
                    assert.strictEqual(service, 'openai');
                    savedKeys.push(key);
                },
            },
            promptForApiKey: async () => 'sk-valid',
            validateKeyFormat: () => true,
            validateWithProgress: async () => ({ isValid: true }),
        });

        assert.deepStrictEqual(savedKeys, ['sk-valid']);
        assert.ok(infoMessages.includes(t('messages.apiKeySaved')));
        assert.ok(infoMessages.includes(t('apiKey.validationSuccess')));
        assert.ok(logMessages.includes('API key saved and validated successfully'));
    });

    test('should retry after validation failure before saving', async () => {
        const savedKeys: string[] = [];
        const promptedKeys = ['sk-first', 'sk-second'];
        let validationAttempts = 0;
        warningResponses = [t('apiKey.retryValidation')];

        await apiKeyFlow.promptAndSaveApiKey({
            logger: { info: () => {} },
            storage: {
                setApiKey: async (_service, key) => {
                    savedKeys.push(key);
                },
            },
            promptForApiKey: async () => promptedKeys.shift(),
            validateKeyFormat: () => true,
            validateWithProgress: async () => {
                validationAttempts += 1;
                return validationAttempts === 1
                    ? { isValid: false, status: 500, error: 'temporary failure' }
                    : { isValid: true };
            },
        });

        assert.strictEqual(validationAttempts, 2);
        assert.deepStrictEqual(savedKeys, ['sk-second']);
    });

    test('should prompt to configure a missing current key', async () => {
        let promptCalled = false;

        await apiKeyFlow.validateCurrentApiKey({
            storage: { getApiKey: async () => undefined },
            promptAndSaveApiKey: async () => {
                promptCalled = true;
            },
            validateWithProgress: async () => {
                throw new Error('validation should not run without a key');
            },
            maxValidationRetries: 3,
        });

        assert.strictEqual(promptCalled, true);
    });
});
