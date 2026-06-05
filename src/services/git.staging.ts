import * as vscode from 'vscode';
import { SimpleGit } from 'simple-git';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';

/**
 * Ask the user whether to stage all changes before generating a diff
 *
 * @param globalState - VS Code global state used to persist the always-stage preference
 * @param logger - Logger used to record the user's choice
 * @returns true when the user agrees to stage changes, false otherwise
 */
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

async function stageFile(
    git: SimpleGit,
    file: string,
    logger: Logger,
    indexLockErrorMessage: string,
): Promise<void> {
    try {
        await git.add(file);
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }
        if (error.message.includes('index.lock')) {
            logger.error('Git index.lock error detected', error);
            vscode.window.showErrorMessage(indexLockErrorMessage);
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

/**
 * Stage modified files, skipping Windows reserved filenames and retrying on index.lock errors
 *
 * @param git - The simple-git client bound to the repository
 * @param modifiedFiles - Paths of files reported as modified
 * @param reservedNameFiles - Subset of modified files using Windows reserved names
 * @param logger - Logger used for diagnostics
 * @param isWindowsReservedNameFn - Predicate identifying Windows reserved filenames
 * @param indexLockRetryDelayMs - Delay before retrying after an index.lock failure
 * @param indexLockErrorMessage - Message shown when an index.lock error persists
 */
export async function stageFiles(
    git: SimpleGit,
    modifiedFiles: string[],
    reservedNameFiles: string[],
    logger: Logger,
    isWindowsReservedNameFn: (filePath: string) => boolean,
    indexLockRetryDelayMs: number,
    indexLockErrorMessage: string,
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
                vscode.window.showErrorMessage(indexLockErrorMessage);
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
            await stageFile(git, file, logger, indexLockErrorMessage);
        }
    }
}

/**
 * Append a note about files with Windows reserved names to a diff
 *
 * @param diff - The current diff text
 * @param reservedNameFiles - Files whose names cannot be staged on Windows
 * @param logger - Logger used to record the warning
 * @returns The diff with a trailing summary of reserved-name files appended
 */
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
