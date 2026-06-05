import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import { IssueType } from '../types/interfaces/Issue';
import { IssueGeneratorService } from '../services/issueGenerator';
import { selectFiles } from '../utils/fileSelector';

/**
 * Prompt the user to choose an issue type from the available options
 *
 * @param service - Issue generator service exposing the available issue types
 * @param logger - Logger for diagnostics
 * @returns The selected issue type, or undefined if cancelled
 */
export async function selectIssueType(
    service: IssueGeneratorService,
    logger: Logger,
): Promise<IssueType | undefined> {
    logger.debug('Prompting user to select issue type');

    const issueTypes: IssueType[] = service.getAvailableTypes();
    const issueType = await vscode.window.showQuickPick<IssueType>(issueTypes, {
        placeHolder: t('quickPick.selectIssueType'),
    });

    if (!issueType) {
        logger.info('Issue type selection cancelled');
        return undefined;
    }

    logger.debug(`Selected issue type: ${issueType.type}`);
    return issueType;
}

/**
 * Prompt the user to pick files from the repository for issue analysis
 *
 * @param service - Issue generator service used to list tracked files
 * @param logger - Logger for diagnostics
 * @returns The list of selected file paths, or undefined if cancelled
 */
export async function selectFilesForAnalysis(
    service: IssueGeneratorService,
    logger: Logger,
): Promise<string[] | undefined> {
    logger.debug('Getting tracked files');

    const files = await service.getTrackedFiles();
    const selectedFiles = await selectFiles(files);

    if (selectedFiles === undefined) {
        logger.info('File selection cancelled');
        return undefined;
    }

    if (selectedFiles.length === 0) {
        logger.info('No files selected');

        const confirm = await vscode.window.showInformationMessage(
            t('messages.noFilesSelectedConfirm'),
            t('buttons.yes'),
            t('buttons.no'),
        );

        if (confirm !== t('buttons.yes')) {
            logger.info('User cancelled issue generation');
            return undefined;
        }
    }

    logger.debug(`Selected ${selectedFiles.length} files for analysis`);
    return selectedFiles;
}

/**
 * Prompt the user to enter a free-form description of the issue to create
 *
 * @param logger - Logger for diagnostics
 * @returns The entered description, or undefined if cancelled
 */
export async function promptIssueDescription(logger: Logger): Promise<string | undefined> {
    logger.debug('Prompting user for issue description');

    const description = await vscode.window.showInputBox({
        placeHolder: t('quickPick.enterIssueDescription'),
        prompt: t('quickPick.describeIssue'),
    });

    if (!description) {
        logger.info('Issue description cancelled');
        return undefined;
    }

    logger.debug('Received issue description');
    return description;
}
