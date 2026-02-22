import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import { GitHubService } from '../services/github';

export async function createPRWithDraftFallback(
    github: GitHubService,
    params: {
        base: string;
        compare: string;
        title: string;
        body: string;
        issueNumber?: number;
        draft: boolean;
    },
    isDraft: boolean,
    logger: Logger,
): Promise<{ number: number; html_url: string; draft?: boolean }> {
    try {
        const pr = await github.createPullRequest(params);
        if (!pr?.number) {
            throw new Error('Failed to create PR: Invalid response from GitHub');
        }
        logger.info(`PR #${pr.number} created successfully`);
        return pr;
    } catch (error: unknown) {
        if (
            !isDraft ||
            !(error instanceof Error) ||
            !error.message?.includes('Draft pull requests are not supported')
        ) {
            throw error;
        }

        logger.warning('Draft PRs not supported, creating regular PR');
        await vscode.window.showInformationMessage(t('messages.draftPRNotSupported'));

        const regularPr = await github.createPullRequest({ ...params, draft: false });
        if (!regularPr?.number) {
            throw new Error('Failed to create regular PR: Invalid response from GitHub');
        }
        logger.info(`Regular PR #${regularPr.number} created successfully`);
        return regularPr;
    }
}
