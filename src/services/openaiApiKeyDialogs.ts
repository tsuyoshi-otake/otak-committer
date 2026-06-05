import * as vscode from 'vscode';
import { t } from '../i18n';

/**
 * User action chosen from the missing-API-key prompt
 */
export type MissingApiKeyAction = 'set' | 'settings' | 'cancel';
/**
 * User action chosen from the invalid-stored-API-key prompt
 */
export type InvalidApiKeyAction = 'update' | 'remove' | 'diagnose' | 'cancel';
/**
 * User action chosen from the API-key validation failure prompt
 */
export type ValidationFailureAction = 'retry' | 'continue' | 'diagnose' | 'cancel';

/**
 * Show the shared API key error dialog with Set/Diagnose/Settings options.
 * Returns when the user has taken an action or cancelled.
 */
export async function showApiKeyErrorDialog(): Promise<void> {
    const setApiKeyLabel = t('apiKey.setApiKey');
    const diagnoseStorageLabel = t('commands.diagnoseStorage');
    const openSettingsLabel = t('commands.openSettings');
    const action = await vscode.window.showErrorMessage(
        t('apiKey.errorPrompt'),
        setApiKeyLabel,
        diagnoseStorageLabel,
        openSettingsLabel,
        t('apiKey.cancel'),
    );

    if (action === setApiKeyLabel) {
        await vscode.commands.executeCommand('otak-committer.setApiKey');
    } else if (action === diagnoseStorageLabel) {
        await vscode.commands.executeCommand('otak-committer.diagnoseStorage');
    } else if (action === openSettingsLabel) {
        await vscode.commands.executeCommand('otak-committer.openSettings');
    }
}

/**
 * Prompt the user when no API key is configured
 *
 * @returns The action the user chose
 */
export async function promptForMissingApiKey(): Promise<MissingApiKeyAction> {
    const setApiKeyLabel = t('apiKey.setApiKey');
    const openSettingsLabel = t('commands.openSettings');
    const action = await vscode.window.showWarningMessage(
        t('messages.apiKeyNotConfigured'),
        setApiKeyLabel,
        openSettingsLabel,
        t('apiKey.cancel'),
    );

    if (action === openSettingsLabel) {
        return 'settings';
    }
    if (action === setApiKeyLabel) {
        return 'set';
    }
    return 'cancel';
}

/**
 * Prompt the user when the stored API key is known to be invalid
 *
 * @returns The action the user chose
 */
export async function promptForInvalidStoredApiKey(): Promise<InvalidApiKeyAction> {
    const updateLabel = t('apiKey.updateKey');
    const removeLabel = t('apiKey.removeKey');
    const diagnoseLabel = t('commands.diagnoseStorage');
    const action = await vscode.window.showErrorMessage(
        t('apiKey.invalidKeyPrompt'),
        updateLabel,
        removeLabel,
        diagnoseLabel,
        t('apiKey.cancel'),
    );

    if (action === diagnoseLabel) {
        return 'diagnose';
    }
    if (action === removeLabel) {
        return 'remove';
    }
    if (action === updateLabel) {
        return 'update';
    }
    return 'cancel';
}

/**
 * Prompt the user after an API key validation attempt fails
 *
 * @param reason - Human-readable reason for the validation failure
 * @returns The action the user chose
 */
export async function promptForValidationFailure(reason: string): Promise<ValidationFailureAction> {
    const retryLabel = t('apiKey.retryValidation');
    const continueLabel = t('apiKey.continueWithoutValidation');
    const diagnoseLabel = t('commands.diagnoseStorage');
    const action = await vscode.window.showWarningMessage(
        t('apiKey.validationFailed', { reason }),
        retryLabel,
        continueLabel,
        diagnoseLabel,
        t('apiKey.cancel'),
    );

    if (action === diagnoseLabel) {
        return 'diagnose';
    }
    if (action === retryLabel) {
        return 'retry';
    }
    if (action === continueLabel) {
        return 'continue';
    }
    return 'cancel';
}
