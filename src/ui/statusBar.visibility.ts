import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger.js';
import { getRepositoryForCurrentWorkspace } from '../services/git.repository.js';

export interface RepositoryVisibility {
    fullName: string;
    isPrivate: boolean;
}

export async function detectRepositoryVisibility(
    logger: Logger,
): Promise<RepositoryVisibility | undefined> {
    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
        logger.debug('Git extension not available for repo visibility detection');
        return undefined;
    }

    const gitApi = gitExtension.getAPI(1);
    const repo = gitApi ? getRepositoryForCurrentWorkspace(gitApi) : undefined;
    if (!repo) {
        logger.debug('No Git repository found for visibility detection');
        return undefined;
    }

    try {
        const remoteUrl = await repo.getConfig('remote.origin.url');
        if (!remoteUrl) {
            logger.debug('No remote origin URL found');
            return undefined;
        }

        const identity = parseGitHubRemoteUrl(remoteUrl);
        if (!identity) {
            logger.debug('Remote URL is not a GitHub repository');
            return undefined;
        }

        const isPrivate = await fetchGitHubRepositoryPrivacy(identity.owner, identity.repo, logger);
        return {
            fullName: `${identity.owner}/${identity.repo}`,
            isPrivate,
        };
    } catch (error) {
        logger.debug(`Failed to detect repo visibility: ${error}`);
        return undefined;
    }
}

function parseGitHubRemoteUrl(remoteUrl: string): { owner: string; repo: string } | undefined {
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)(?:\.git)?$/);
    if (!match) {
        return undefined;
    }
    const [, owner, repo] = match;
    return { owner, repo };
}

async function fetchGitHubRepositoryPrivacy(
    owner: string,
    repo: string,
    logger: Logger,
): Promise<boolean> {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const response = await fetch(url, {
        headers: { 'User-Agent': 'otak-committer' },
    });

    if (!response.ok) {
        logger.debug(`Repository ${owner}/${repo} detected as private`);
        return true;
    }

    const data = (await response.json()) as { private: boolean };
    logger.debug(`Repository ${owner}/${repo} visibility: ${data.private ? 'private' : 'public'}`);
    return data.private;
}
