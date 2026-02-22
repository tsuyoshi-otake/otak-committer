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
            if (result.isValid) {
                await storage.setApiKey('openai', apiKey);
                vscode.window.showInformationMessage(t('messages.apiKeySaved'));
                vscode.window.showInformationMessage(t('apiKey.validationSuccess'));
                logger.info('API key saved and validated successfully');
                return;
            }

            const reason = result.error || 'Unknown error';
            const retryLabel = t('apiKey.retryValidation');
            const continueLabel = t('apiKey.continueWithoutValidation');
            const cancelLabel = t('apiKey.cancel');

            const action =
                result.status === 401
                    ? await vscode.window.showWarningMessage(
                          t('apiKey.validationFailed', { reason }),
                          retryLabel,
                          cancelLabel,
                      )
                    : await vscode.window.showWarningMessage(
                          t('apiKey.validationFailed', { reason }),
                          retryLabel,
                          continueLabel,
                          cancelLabel,
                      );

            if (action === retryLabel) {
                continue;
            }

            if (action === continueLabel) {
                await storage.setApiKey('openai', apiKey);
                vscode.window.showInformationMessage(t('messages.apiKeySaved'));
                logger.info('API key saved without validation');
            }
            return;
        }

        await storage.setApiKey('openai', apiKey);
        vscode.window.showInformationMessage(t('messages.apiKeySaved'));
        logger.info('API key saved successfully');
        return;
    }
}

export async function validateCurrentApiKey(input: ValidateCurrentApiKeyInput): Promise<void> {
    const { storage, promptAndSaveApiKey, validateWithProgress, maxValidationRetries } = input;
    const currentKey = (await storage.getApiKey('openai'))?.trim();

    if (!currentKey) {
        const setApiKeyLabel = t('apiKey.setApiKey');
        const action = await vscode.window.showWarningMessage(
            t('messages.apiKeyNotConfigured'),
            setApiKeyLabel,
            t('apiKey.cancel'),
        );

        if (action === setApiKeyLabel) {
            await promptAndSaveApiKey();
        }
        return;
    }

    let attempts = 0;
    const retryLabel = t('apiKey.retryValidation');
    const updateLabel = t('apiKey.updateKey');
    const cancelLabel = t('apiKey.cancel');

    while (attempts < maxValidationRetries) {
        attempts += 1;

        const result = await validateWithProgress(currentKey);
        if (result.isValid) {
            vscode.window.showInformationMessage(t('apiKey.validationSuccess'));
            return;
        }

        const reason = result.error || 'Unknown error';
        const action = await vscode.window.showErrorMessage(
            t('apiKey.validationFailed', { reason }),
            retryLabel,
            updateLabel,
            cancelLabel,
        );

        if (action === retryLabel) {
            continue;
        }

        if (action === updateLabel) {
            await promptAndSaveApiKey();
        }
        return;
    }
}
