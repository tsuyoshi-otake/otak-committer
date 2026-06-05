import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { StorageManager } from '../infrastructure/storage/StorageManager';
import { t } from '../i18n/index';

interface ValidationResultLike {
    isValid: boolean;
    status?: number;
    error?: string;
}

interface PromptAndSaveApiKeyInput {
    logger: Logger;
    storage: StorageManager;
    promptForApiKey: () => Promise<string | undefined>;
    validateKeyFormat: (key: string) => boolean;
    validateWithProgress: (apiKey: string) => Promise<ValidationResultLike>;
}

interface ValidateCurrentApiKeyInput {
    storage: StorageManager;
    promptAndSaveApiKey: () => Promise<void>;
    validateWithProgress: (apiKey: string) => Promise<ValidationResultLike>;
    maxValidationRetries: number;
}

type ValidationFailureDecision = 'retry' | 'done';

export async function promptAndSaveApiKey(input: PromptAndSaveApiKeyInput): Promise<void> {
    const { logger, storage, promptForApiKey, validateKeyFormat, validateWithProgress } = input;

    while (true) {
        const apiKey = await promptForApiKey();
        if (!apiKey) {
            logger.info('User cancelled API key input');
            return;
        }

        if (!validateKeyFormat(apiKey)) {
            vscode.window.showErrorMessage(t('apiKey.invalidFormat'));
            continue;
        }

        const validateChoice = await vscode.window.showInformationMessage(
            t('apiKey.validatePrompt'),
            t('buttons.yes'),
            t('buttons.no'),
        );

        if (validateChoice === t('buttons.yes')) {
            const result = await validateWithProgress(apiKey);
            const decision = await handleNewKeyValidationResult(result, apiKey, storage, logger);
            if (decision === 'retry') {
                continue;
            }
            return;
        }

        await saveOpenAIApiKey(storage, logger, apiKey, 'API key saved successfully');
        return;
    }
}

export async function validateCurrentApiKey(input: ValidateCurrentApiKeyInput): Promise<void> {
    const { storage, promptAndSaveApiKey, validateWithProgress, maxValidationRetries } = input;
    const currentKey = (await storage.getApiKey('openai'))?.trim();

    if (!currentKey) {
        await promptToSetMissingApiKey(promptAndSaveApiKey);
        return;
    }

    let attempts = 0;

    while (attempts < maxValidationRetries) {
        attempts += 1;

        const result = await validateWithProgress(currentKey);
        if (result.isValid) {
            vscode.window.showInformationMessage(t('apiKey.validationSuccess'));
            return;
        }

        const decision = await handleCurrentKeyValidationFailure(result, promptAndSaveApiKey);
        if (decision === 'retry') {
            continue;
        }
        return;
    }
}

async function handleNewKeyValidationResult(
    result: ValidationResultLike,
    apiKey: string,
    storage: StorageManager,
    logger: Logger,
): Promise<ValidationFailureDecision> {
    if (result.isValid) {
        await saveOpenAIApiKey(
            storage,
            logger,
            apiKey,
            'API key saved and validated successfully',
            true,
        );
        return 'done';
    }

    const action = await promptAfterNewKeyValidationFailure(result);
    if (action === t('apiKey.retryValidation')) {
        return 'retry';
    }

    if (action === t('apiKey.continueWithoutValidation')) {
        await saveOpenAIApiKey(storage, logger, apiKey, 'API key saved without validation');
    }

    return 'done';
}

async function promptAfterNewKeyValidationFailure(
    result: ValidationResultLike,
): Promise<string | undefined> {
    const reason = result.error || 'Unknown error';
    const retryLabel = t('apiKey.retryValidation');
    const continueLabel = t('apiKey.continueWithoutValidation');
    const cancelLabel = t('apiKey.cancel');
    const options =
        result.status === 401
            ? [retryLabel, cancelLabel]
            : [retryLabel, continueLabel, cancelLabel];

    return vscode.window.showWarningMessage(t('apiKey.validationFailed', { reason }), ...options);
}

async function promptToSetMissingApiKey(promptAndSaveApiKey: () => Promise<void>): Promise<void> {
    const setApiKeyLabel = t('apiKey.setApiKey');
    const action = await vscode.window.showWarningMessage(
        t('messages.apiKeyNotConfigured'),
        setApiKeyLabel,
        t('apiKey.cancel'),
    );

    if (action === setApiKeyLabel) {
        await promptAndSaveApiKey();
    }
}

async function handleCurrentKeyValidationFailure(
    result: ValidationResultLike,
    promptAndSaveApiKey: () => Promise<void>,
): Promise<ValidationFailureDecision> {
    const retryLabel = t('apiKey.retryValidation');
    const updateLabel = t('apiKey.updateKey');
    const cancelLabel = t('apiKey.cancel');
    const reason = result.error || 'Unknown error';

    const action = await vscode.window.showErrorMessage(
        t('apiKey.validationFailed', { reason }),
        retryLabel,
        updateLabel,
        cancelLabel,
    );

    if (action === retryLabel) {
        return 'retry';
    }

    if (action === updateLabel) {
        await promptAndSaveApiKey();
    }

    return 'done';
}

async function saveOpenAIApiKey(
    storage: StorageManager,
    logger: Logger,
    apiKey: string,
    logMessage: string,
    showValidationSuccess = false,
): Promise<void> {
    await storage.setApiKey('openai', apiKey);
    vscode.window.showInformationMessage(t('messages.apiKeySaved'));

    if (showValidationSuccess) {
        vscode.window.showInformationMessage(t('apiKey.validationSuccess'));
    }

    logger.info(logMessage);
}
