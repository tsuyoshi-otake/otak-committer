import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import { IssueType } from '../types/issue';
import { IssueGeneratorService } from '../services/issueGenerator';
import { selectFiles } from '../utils/fileSelector';

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
