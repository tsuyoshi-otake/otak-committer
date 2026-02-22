import { GitHubAPI, GitHubApiError, GitHubDiffFile, PullRequestDiff } from '../types';
import { Logger } from '../infrastructure/logging/Logger';
import { TokenManager } from './tokenManager';

export function isNoCommitsBetweenBranchesError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }

    const status = 'status' in error ? error.status : undefined;
    const respStatus =
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'status' in error.response
            ? error.response.status
            : undefined;
    const effectiveStatus = status ?? respStatus;
    if (effectiveStatus !== 422) {
        return false;
    }

    const message = error instanceof Error ? error.message : '';
    const dataMessage =
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
            ? error.response.data.message
            : '';

    return message.includes('No commits between') || dataMessage.includes('No commits between');
}

export async function getBranchDiffDetails(
    octokit: GitHubAPI,
    owner: string,
    repo: string,
    base: string,
    compare: string,
    logger: Logger,
): Promise<PullRequestDiff> {
    logger.info(`Getting diff between ${base} and ${compare}`);

    const response = await octokit.repos.compareCommits({
        owner,
        repo,
        base,
        head: compare,
    });

    if (response.status !== 200 || !response.data.files) {
        logger.error(`Failed to get diff: status ${response.status}`);
        throw new GitHubApiError('Failed to get diff', response.status);
    }

    let totalTokens = 0;
    const files: GitHubDiffFile[] = response.data.files.map((file) => ({
        filename: file.filename,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch || '',
    }));

    logger.info(`Retrieved diff for ${files.length} files`);
    const maxTokensLimit = TokenManager.getConfiguredMaxTokens();

    for (const file of files) {
        totalTokens += TokenManager.estimateTokens(file.patch);
    }

    if (totalTokens > maxTokensLimit) {
        logger.warning(`Diff size (${totalTokens} tokens) exceeds limit (${maxTokensLimit}), truncating`);
        const ratio = maxTokensLimit / totalTokens;
        for (const file of files) {
            const maxLength = Math.floor(file.patch.length * ratio);
            if (file.patch.length > maxLength) {
                file.patch = file.patch.substring(0, maxLength) + '\n... (diff truncated due to token limit)';
            }
        }
    }

    return {
        files,
        stats: {
            additions: files.reduce((sum: number, file: GitHubDiffFile) => sum + file.additions, 0),
            deletions: files.reduce((sum: number, file: GitHubDiffFile) => sum + file.deletions, 0),
        },
    };
}
