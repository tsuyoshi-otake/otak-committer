import { GitHubAPI, GitHubServiceError } from '../types';
import { Logger } from '../infrastructure/logging/Logger';

/**
 * Fetch the list of branch names for a repository
 *
 * @param octokit - The GitHub API client
 * @param owner - The repository owner
 * @param repo - The repository name
 * @param pageSize - The maximum number of branches to retrieve per page
 * @param logger - The logger used to record progress
 * @returns The branch names for the repository
 */
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
        throw new GitHubServiceError('Failed to get branches', response.status);
    }

    const branches = response.data.map((branch) => branch.name);
    logger.info(`Retrieved ${branches.length} branches`);
    return branches;
}
