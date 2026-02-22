import {
    CreatePullRequestResponse,
    GitHubAPI,
    GitHubApiError,
    PullRequestParams,
} from '../types';
import { Logger } from '../infrastructure/logging/Logger';
import { getIssue } from './github.issues';

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
        throw new GitHubApiError('Failed to create pull request', response.status);
    }

    logger.info(`Pull request #${response.data.number} created successfully`);
    return {
        number: response.data.number,
        html_url: response.data.html_url,
        draft: params.draft || false,
    };
}
