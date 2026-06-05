import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import { IssueInfo } from '../types';
import { GitHubService } from '../services/github';

/**
 * Prompt the user to choose a related issue to link to the new pull request
 *
 * @param github - GitHub service used to list open issues
 * @param logger - Logger for diagnostics
 * @returns The selected issue number, or undefined if no issue was chosen
 */
export async function selectIssue(
    github: GitHubService,
    logger: Logger,
): Promise<number | undefined> {
    logger.debug('Fetching issues for selection');

    try {
        const issues = await github.getIssues();
        if (issues.length === 0) {
            logger.debug('No open issues found');
            return undefined;
        }

        const issueItems = issues.map((issue: IssueInfo) => ({
            label: `#${issue.number} ${issue.title}`,
            description: issue.labels.join(', '),
            issue,
        }));

        const selectedIssue = await vscode.window.showQuickPick(issueItems, {
            placeHolder: t('quickPick.selectRelatedIssue'),
            ignoreFocusOut: true,
        });

        if (selectedIssue) {
            logger.debug(`Selected issue #${selectedIssue.issue.number}`);
            return selectedIssue.issue.number;
        }

        return undefined;
    } catch (error) {
        logger.warning('Failed to fetch issues', error);
        return undefined;
    }
}

/**
 * Prompt the user to choose between a draft and a regular pull request
 *
 * @param logger - Logger for diagnostics
 * @returns The selected PR type descriptor, or undefined if cancelled
 */
export async function selectPRType(
    logger: Logger,
): Promise<{ label: string; value: boolean } | undefined> {
    logger.debug('Selecting PR type');

    const prType = await vscode.window.showQuickPick(
        [
            {
                label: t('prTypes.draft'),
                description: t('prTypes.draftDescription'),
                value: true,
            },
            {
                label: t('prTypes.regular'),
                description: t('prTypes.regularDescription'),
                value: false,
            },
        ],
        {
            placeHolder: t('quickPick.selectPRType'),
            ignoreFocusOut: true,
        },
    );

    if (!prType) {
        logger.info('PR type selection cancelled');
        return undefined;
    }

    logger.debug(`Selected PR type: ${prType.label}`);
    return prType;
}
