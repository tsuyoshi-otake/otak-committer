import { GitHubAPI, GitHubServiceError } from '../types';
import { Logger } from '../infrastructure/logging/Logger';
import { collectPages } from './github.pagination';

/**
 * Fetch the list of branch names for a repository, page by page up to the
 * shared page limit
 *
 * @param octokit - The GitHub API client
 * @param owner - The repository owner
 * @param repo - The repository name
 * @param pageSize - The number of branches requested per page
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

    const { items: branches, truncated } = await collectPages(async (page) => {
        const response = await octokit.repos.listBranches({
            owner,
            repo,
            per_page: pageSize,
            page,
        });

        if (response.status !== 200) {
            logger.error(`Failed to get branches: status ${response.status}`);
            throw new GitHubServiceError('Failed to get branches', response.status);
        }

        return response.data.map((branch) => branch.name);
    }, pageSize);

    if (truncated) {
        logger.warning(`Branch list stopped at ${branches.length} branches (page limit reached)`);
    }
    logger.info(`Retrieved ${branches.length} branches`);
    return branches;
}
