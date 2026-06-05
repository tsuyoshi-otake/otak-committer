import {
    CreatePullRequestResponse,
    GitHubAPI,
    GitHubServiceError,
    PullRequestParams,
} from '../types';
import { Logger } from '../infrastructure/logging/Logger';
import { getIssue } from './github.issues';

/**
 * Create a pull request, optionally linking to an existing issue
 *
 * @param octokit - The GitHub API client
 * @param owner - The repository owner
 * @param repo - The repository name
 * @param params - The pull request branches, content, and optional issue link
 * @param logger - The logger used to record progress
 * @returns The newly created pull request number, HTML URL, and draft flag
 */
export async function createPullRequest(
    octokit: GitHubAPI,
    owner: string,
    repo: string,
    params: PullRequestParams,
    logger: Logger,
): Promise<CreatePullRequestResponse> {
    logger.info(`Creating pull request from ${params.compare} to ${params.base}`);

    let title = params.title;
    let body = params.body;

    if (params.issueNumber) {
        logger.info(`Linking to issue #${params.issueNumber}`);
        const issue = await getIssue(octokit, owner, repo, params.issueNumber, logger);
        title = title || issue.title;
        body = body || `Closes #${issue.number}\n\n${issue.body}`;
    }

    const response = await octokit.pulls.create({
        owner,
        repo,
        base: params.base,
        head: params.compare,
        title: title || 'Pull Request',
        body: body || '',
        draft: params.draft || false,
    });

    if (response.status !== 201) {
        logger.error(`Failed to create pull request: status ${response.status}`);
        throw new GitHubServiceError('Failed to create pull request', response.status);
    }

    logger.info(`Pull request #${response.data.number} created successfully`);
    return {
        number: response.data.number,
        html_url: response.data.html_url,
        draft: params.draft || false,
    };
}
