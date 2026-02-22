import * as vscode from 'vscode';
import { SimpleGit } from 'simple-git';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';

export async function promptForStaging(
    globalState: vscode.Memento | undefined,
    logger: Logger,
): Promise<boolean> {
    const alwaysStage = globalState?.get<boolean>('otak-committer.alwaysStageAll', false);
    if (alwaysStage) {
        return true;
    }

    const stageAllLabel = t('git.stageAll');
    const alwaysStageLabel = t('git.alwaysStageAll');
    const action = await vscode.window.showInformationMessage(
        t('git.stageAllPrompt'),
        stageAllLabel,
        alwaysStageLabel,
        t('apiKey.cancel'),
    );

    if (action === alwaysStageLabel) {
        await globalState?.update('otak-committer.alwaysStageAll', true);
        logger.info('User chose to always stage changes');
        return true;
    }

    if (action !== stageAllLabel) {
        logger.info('User cancelled staging changes for diff generation');
        return false;
    }

    return true;
}

async function stageFile(git: SimpleGit, file: string, logger: Logger): Promise<void> {
    try {
        await git.add(file);
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }
        if (error.message.includes('index.lock')) {
            logger.error('Git index.lock error detected', error);
            vscode.window.showErrorMessage(t('git.busyIndexLock'));
            throw error;
        }
        if (error.message.includes('did not match any files')) {
            try {
                await git.rm(file);
            } catch {
                // ignore if already deleted
            }
            return;
        }
        throw error;
    }
}

export async function stageFiles(
    git: SimpleGit,
    modifiedFiles: string[],
    reservedNameFiles: string[],
    logger: Logger,
    isWindowsReservedNameFn: (filePath: string) => boolean,
    indexLockRetryDelayMs: number,
): Promise<void> {
    try {
        await git.add(['-A']);
    } catch (error) {
        if (error instanceof Error && error.message.includes('index.lock')) {
            logger.warning('Git index.lock detected, retrying after delay...');
            await new Promise((resolve) => setTimeout(resolve, indexLockRetryDelayMs));
            try {
                await git.add(['-A']);
                return;
            } catch (retryError) {
                logger.error('Git index.lock error persists after retry', retryError);
                vscode.window.showErrorMessage(t('git.busyIndexLock'));
                throw retryError;
            }
        }

        const addableFiles = modifiedFiles.filter((file) => !isWindowsReservedNameFn(file));
        if (reservedNameFiles.length > 0) {
            logger.warning(
                `Skipping Windows reserved name files during staging: ${reservedNameFiles.join(', ')}`,
            );
        }

        for (const file of addableFiles) {
            await stageFile(git, file, logger);
        }
    }
}

export function appendReservedFileInfo(
    diff: string,
    reservedNameFiles: string[],
    logger: Logger,
): string {
    if (reservedNameFiles.length === 0) {
        return diff;
    }

    const reservedFilesList = reservedNameFiles.join(', ');
    logger.warning(`Files with reserved names found: ${reservedFilesList}`);
    vscode.window.showInformationMessage(t('git.reservedNamesInfo', { files: reservedFilesList }));

    let result = diff;
    if (result && result.trim() !== '') {
        result += '\n\n';
    }
    result += '# Files with reserved names (content not available):\n';
    reservedNameFiles.forEach((file) => {
        result += `# - ${file}\n`;
    });
    return result;
}
