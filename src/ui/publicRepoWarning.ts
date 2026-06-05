import * as vscode from 'vscode';
import { t } from '../i18n/index.js';

const PUBLIC_REPO_WARNING_SUPPRESSED_KEY = 'publicRepoWarningSuppressed';

export function isPublicRepoWarningSuppressed(
    globalState: vscode.Memento,
    repoFullName: string | null,
): boolean {
    if (!repoFullName) {
        return false;
    }
    return getSuppressedRepos(globalState).includes(repoFullName);
}

export async function suppressPublicRepoWarning(
    globalState: vscode.Memento,
    repoFullName: string | null,
): Promise<void> {
    if (!repoFullName) {
        return;
    }

    const suppressed = getSuppressedRepos(globalState);
    if (!suppressed.includes(repoFullName)) {
        suppressed.push(repoFullName);
        await globalState.update(PUBLIC_REPO_WARNING_SUPPRESSED_KEY, suppressed);
    }
}

export async function showPublicRepoOpenWarning(
    globalState: vscode.Memento,
    repoFullName: string | null,
): Promise<void> {
    const choice = await vscode.window.showWarningMessage(
        t('messages.publicRepoOpenWarning'),
        t('buttons.yes'),
        t('buttons.dontShowAgain'),
    );
    if (choice === t('buttons.dontShowAgain')) {
        await suppressPublicRepoWarning(globalState, repoFullName);
    }
}

function getSuppressedRepos(globalState: vscode.Memento): string[] {
    return globalState.get(PUBLIC_REPO_WARNING_SUPPRESSED_KEY, []);
}
