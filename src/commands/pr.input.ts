import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import { IssueInfo } from '../types';
import { GitHubService } from '../services/github';

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
