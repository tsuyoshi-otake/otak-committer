import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index';

/**
 * User-selectable action when managing an existing API key.
 */
export type ApiKeyAction = 'update' | 'validate' | 'remove' | 'cancel';

/**
 * Show an input box that prompts the user to enter an API key
 *
 * @param logger - Logger used to record the prompt event
 * @param validateKeyFormat - Predicate used to validate the format of the entered key
 * @returns The entered API key, or undefined if the user cancelled
 */
export async function promptForApiKey(
    logger: Logger,
    validateKeyFormat: (key: string) => boolean,
): Promise<string | undefined> {
    logger.info('Prompting user for API key');

    return vscode.window.showInputBox({
        prompt: t('apiKey.enterKey'),
        password: true,
        placeHolder: t('apiKey.placeholder'),
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return null;
            }
            if (!validateKeyFormat(value)) {
                return t('apiKey.invalidFormat');
            }
            return null;
        },
    });
}

/**
 * Show a quick pick offering actions for an already-stored API key
 *
 * @param logger - Logger used to record the action selection
 * @returns The action chosen by the user, or 'cancel' if none was selected
 */
export async function handleExistingKey(logger: Logger): Promise<ApiKeyAction> {
    logger.info('Handling existing API key scenario');

    const items: (vscode.QuickPickItem & { action: ApiKeyAction })[] = [
        { label: t('apiKey.updateKey'), description: '', action: 'update' },
        { label: t('apiKey.validateKey'), description: '', action: 'validate' },
        { label: t('apiKey.removeKey'), description: '', action: 'remove' },
        { label: t('apiKey.cancel'), description: '', action: 'cancel' },
    ];

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: t('apiKey.keyExists'),
        title: t('apiKey.chooseAction'),
    });

    return selected?.action ?? 'cancel';
}
