import {
    GitHubAPI,
    GitHubApiError,
    GitHubLabel,
    IssueInfo,
    IssueParams,
} from '../types';
import { Logger } from '../infrastructure/logging/Logger';

export async function getIssue(
    octokit: GitHubAPI,
    owner: string,
    repo: string,
    number: number,
    logger: Logger,
): Promise<IssueInfo> {
    logger.info(`Getting issue #${number}`);

    const response = await octokit.issues.get({
        owner,
        repo,
        issue_number: number,
    });

    if (response.status !== 200) {
        logger.error(`Failed to get issue: status ${response.status}`);
        throw new GitHubApiError('Failed to get issue', response.status);
    }

    logger.info(`Retrieved issue #${number}: ${response.data.title}`);
    return {
        number: response.data.number,
        title: response.data.title,
        body: response.data.body || '',
        labels: response.data.labels.map((label: string | GitHubLabel) =>
            typeof label === 'string' ? label : label.name || '',
        ),
    };
}

export async function createIssue(
    octokit: GitHubAPI,
    owner: string,
    repo: string,
    params: IssueParams,
    logger: Logger,
): Promise<{ number: number; html_url: string }> {
    logger.info(`Creating issue: ${params.title}`);

    const response = await octokit.issues.create({
        owner,
        repo,
        title: params.title,
        body: params.body,
        labels: params.labels,
    });

    if (response.status !== 201) {
        logger.error(`Failed to create issue: status ${response.status}`);
        throw new GitHubApiError('Failed to create issue', response.status);
    }

    logger.info(`Issue #${response.data.number} created successfully`);
    return {
        number: response.data.number,
        html_url: response.data.html_url,
    };
}

export async function getIssues(
    octokit: GitHubAPI,
    owner: string,
    repo: string,
    pageSize: number,
    logger: Logger,
): Promise<IssueInfo[]> {
    logger.debug('Getting issues');

    const response = await octokit.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        sort: 'updated',
        direction: 'desc',
        per_page: pageSize,
    });

    if (response.status !== 200) {
        logger.error(`Failed to get issues: status ${response.status}`);
        throw new GitHubApiError('Failed to get issues', response.status);
    }

    const issues = response.data
        .filter((item) => !('pull_request' in item))
        .map((issue) => ({
            number: issue.number,
            title: issue.title,
            body: issue.body || '',
            labels: (issue.labels || []).map((label: string | GitHubLabel) =>
                typeof label === 'string' ? label : label.name || '',
            ),
        }));

    logger.info(`Retrieved ${issues.length} open issues`);
    return issues;
}
