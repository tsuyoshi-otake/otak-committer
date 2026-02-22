import * as vscode from 'vscode';
import { ServiceError } from '../types/errors';
import { t } from '../i18n/index.js';

export function isGitHubApiError(
    error: unknown,
): error is { response: { errors: Array<{ message: string }> } } {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    const obj = error as Record<string, unknown>;
    if (typeof obj.response !== 'object' || obj.response === null) {
        return false;
    }
    const resp = obj.response as Record<string, unknown>;
    return Array.isArray(resp.errors);
}

export function handleCreatePRError(error: unknown): never | void {
    if (error instanceof Error && error.message === 'No changes to create a pull request') {
        vscode.window.showErrorMessage(t('messages.noChangesBetweenBranches'));
        return;
    }

    if (isGitHubApiError(error)) {
        const messages = error.response.errors.map((e: { message: string }) => e.message).join(', ');
        throw new ServiceError(`Failed to create PR: ${messages}`, 'github', {
            originalError: error,
        });
    }

    throw error;
}
