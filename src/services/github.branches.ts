import { GitHubAPI, GitHubApiError } from '../types';
import { Logger } from '../infrastructure/logging/Logger';

export async function getBranches(
    octokit: GitHubAPI,
    owner: string,
    repo: string,
    pageSize: number,
    logger: Logger,
): Promise<string[]> {
    logger.debug('Getting branches');

    const response = await octokit.repos.listBranches({
        owner,
        repo,
        per_page: pageSize,
    });

    if (response.status !== 200) {
        logger.error(`Failed to get branches: status ${response.status}`);
        throw new GitHubApiError('Failed to get branches', response.status);
    }

    const branches = response.data.map((branch) => branch.name);
    logger.info(`Retrieved ${branches.length} branches`);
    return branches;
}
