import * as vscode from 'vscode';
import { SimpleGit } from 'simple-git';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import {
    classifyWorkingTreeChanges,
    listStagedPaths,
    stageChanges,
    unstagePaths,
} from './git.staging';
import { promptForStaging } from './git.stagingPrompts';

/**
 * A staged diff plus the paths the extension staged to produce it
 */
export interface CollectedDiff {
    diff: string;
    /**
     * Paths the extension staged for this diff; empty when the user had staged
     * changes already. The caller unstages them if it abandons the commit.
     */
    stagedByExtension: string[];
}

/**
 * Collect the staged git diff, prompting the user to stage changes when needed
 *
 * Staging that does not lead to a returned diff (empty result or failure) is
 * undone here; once a diff is returned, the caller owns undoing it.
 *
 * @param git - The simple-git client bound to the repository
 * @param logger - Logger used for diagnostics
 * @param globalState - VS Code global state for persisting staging preferences
 * @param isWindowsReservedNameFn - Predicate identifying Windows reserved filenames
 * @param indexLockRetryDelayMs - Delay before retrying after an index.lock failure
 * @param indexLockErrorMessage - Message shown when an index.lock error is detected
 * @returns The cached diff and what the extension staged, or undefined when there is nothing to commit
 */
export async function collectDiff(
    git: SimpleGit,
    logger: Logger,
    globalState: vscode.Memento | undefined,
    isWindowsReservedNameFn: (filePath: string) => boolean,
    indexLockRetryDelayMs: number,
    indexLockErrorMessage: string,
): Promise<CollectedDiff | undefined> {
    logger.debug('Getting git diff');
    const status = await git.status();

    const modifiedFiles = status.files
        .filter((file) => file.working_dir !== ' ' || file.index !== ' ')
        .map((file) => file.path);

    logger.debug(`Found ${modifiedFiles.length} modified files`);

    const reservedNameFiles = modifiedFiles.filter((file) => isWindowsReservedNameFn(file));
    const hasStagedChanges = listStagedPaths(status.files).length > 0;

    let diff = hasStagedChanges ? await git.diff(['--cached']) : '';
    let stagedByExtension: string[] = [];

    if (!hasStagedChanges && modifiedFiles.length > 0) {
        const changes = classifyWorkingTreeChanges(status.files);
        const mode = await promptForStaging(globalState, changes, logger);
        if (!mode) {
            return undefined;
        }

        try {
            await stageChanges(git, {
                mode,
                changes,
                reservedNameFiles,
                isWindowsReservedName: isWindowsReservedNameFn,
                indexLockRetryDelayMs,
                onIndexLockFailure: () =>
                    void vscode.window.showErrorMessage(indexLockErrorMessage),
                logger,
            });
            stagedByExtension = listStagedPaths((await git.status()).files);
            diff = await git.diff(['--cached']);
        } catch (error) {
            // Nothing was staged before, so everything staged now is ours to undo
            await unstageQuietly(
                git,
                async () => listStagedPaths((await git.status()).files),
                logger,
            );
            throw error;
        }
    }

    if ((!diff || diff.trim() === '') && reservedNameFiles.length === 0) {
        logger.info('No staged files found');
        await unstageQuietly(git, async () => stagedByExtension, logger);
        return undefined;
    }

    logger.info(`Processing diff, ${reservedNameFiles.length} reserved name files`);
    diff = appendReservedFileInfo(diff, reservedNameFiles, logger);
    logger.info('Git diff retrieved successfully');
    return { diff, stagedByExtension };
}

async function unstageQuietly(
    git: SimpleGit,
    getPaths: () => Promise<string[]>,
    logger: Logger,
): Promise<void> {
    try {
        const paths = await getPaths();
        if (paths.length > 0) {
            await unstagePaths(git, paths);
            logger.info(`Unstaged ${paths.length} path(s) staged by the extension`);
        }
    } catch (error) {
        logger.error('Failed to unstage changes staged by the extension', error);
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
function appendReservedFileInfo(diff: string, reservedNameFiles: string[], logger: Logger): string {
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
