import * as vscode from 'vscode';
import { SimpleGit } from 'simple-git';
import { Logger } from '../infrastructure/logging/Logger';
import { TokenManager } from './tokenManager';
import { t } from '../i18n/index.js';
import { appendReservedFileInfo, promptForStaging, stageFiles } from './git.staging';

export async function collectDiff(
    git: SimpleGit,
    logger: Logger,
    globalState: vscode.Memento | undefined,
    isWindowsReservedNameFn: (filePath: string) => boolean,
    indexLockRetryDelayMs: number,
): Promise<string | undefined> {
    logger.debug('Getting git diff');
    const status = await git.status();

    const modifiedFiles = status.files
        .filter((file) => file.working_dir !== ' ' || file.index !== ' ')
        .map((file) => file.path);

    logger.debug(`Found ${modifiedFiles.length} modified files`);

    const reservedNameFiles = modifiedFiles.filter((file) => isWindowsReservedNameFn(file));
    const hasStagedChanges = status.files.some(
        (file) => file.index !== ' ' && file.index !== '?' && file.index !== '!',
    );

    let diff = hasStagedChanges ? await git.diff(['--cached']) : '';

    if (!hasStagedChanges && modifiedFiles.length > 0) {
        const shouldStage = await promptForStaging(globalState, logger);
        if (!shouldStage) {
            return undefined;
        }

        await stageFiles(
            git,
            modifiedFiles,
            reservedNameFiles,
            logger,
            isWindowsReservedNameFn,
            indexLockRetryDelayMs,
        );
        diff = await git.diff(['--cached']);
    }

    if ((!diff || diff.trim() === '') && reservedNameFiles.length === 0) {
        logger.info('No staged files found');
        return undefined;
    }

    logger.info(`Processing diff, ${reservedNameFiles.length} reserved name files`);
    diff = appendReservedFileInfo(diff, reservedNameFiles, logger);
    logger.info('Git diff retrieved successfully');
    return diff;
}

export function truncateDiffByTokenLimit(diff: string, logger: Logger): string {
    const truncateThresholdTokens = TokenManager.getConfiguredMaxTokens();
    const tokenCount = TokenManager.estimateTokens(diff);

    if (tokenCount <= truncateThresholdTokens) {
        return diff;
    }

    const estimatedKTokens = Math.floor(tokenCount / 1000);
    const thresholdKTokens = Math.floor(truncateThresholdTokens / 1000);
    const truncatedLength = truncateThresholdTokens * TokenManager.CHARS_PER_TOKEN;

    logger.warning(
        `Diff size (${estimatedKTokens}K tokens) exceeds ${thresholdKTokens}K limit, truncating`,
    );
    vscode.window.showWarningMessage(
        t('git.diffTruncatedWarning', { estimatedKTokens, thresholdKTokens }),
    );

    return diff.substring(0, truncatedLength);
}
