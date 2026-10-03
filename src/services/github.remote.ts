/**
 * Owner and repository name identified from a GitHub remote URL.
 */
export interface GitHubRemoteIdentity {
    owner: string;
    repo: string;
}

/**
 * Parse a GitHub remote URL (HTTPS, SSH, or scp-like `git@github.com:owner/repo`).
 *
 * Repository names may contain dots; a trailing `.git` and a trailing slash are not
 * part of the name.
 *
 * @param remoteUrl - The value of `remote.origin.url`
 * @returns The owner and repository, or undefined when the URL is not a GitHub remote
 */
export function parseGitHubRemoteUrl(remoteUrl: string): GitHubRemoteIdentity | undefined {
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (!match) {
        return undefined;
    }
    const [, owner, repo] = match;
    return { owner, repo };
}
