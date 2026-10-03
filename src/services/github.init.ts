import * as vscode from 'vscode';
import { authentication } from 'vscode';
import { t } from '../i18n';
import { GitHubAPI } from '../types';
import { Logger } from '../infrastructure/logging/Logger';
import {
    getRepositoryForCurrentWorkspace,
    GitApiRepository,
    GitExtensionAPI,
} from './git.repository';
import { parseGitHubRemoteUrl } from './github.remote';

/**
 * Resolved state produced when the GitHub service is initialized for a workspace
 */
export interface GitHubInitializationResult {
    octokit: GitHubAPI;
    repository: GitApiRepository;
    owner: string;
    repo: string;
}

async function detectRepositoryInfo(repository: GitApiRepository, logger: Logger): Promise<{
    owner: string;
    repo: string;
}> {
    logger.debug('Detecting repository information');

    const remoteUrl = await repository.getConfig('remote.origin.url');
    if (!remoteUrl) {
        logger.error('No remote origin URL found');
        throw new Error(t('errors.noRemoteOriginUrl'));
    }

    const identity = parseGitHubRemoteUrl(remoteUrl);
    if (!identity) {
        logger.error(`Unable to parse GitHub repository from URL: ${remoteUrl}`);
        throw new Error(t('errors.unableToParseGitHubRepository'));
    }

    logger.info(`Detected repository: ${identity.owner}/${identity.repo}`);
    return identity;
}

/**
 * Create the Octokit client used for every GitHub API call
 *
 * The client deliberately has no custom transport. Octokit sends requests with the
 * global `fetch`, which the VS Code extension host routes through `http.proxy`,
 * `http.noProxy`, proxy authentication and the system certificates. A custom
 * `request.fetch` would bypass those settings, and `request.agent` is ignored by Octokit.
 *
 * @param accessToken - The GitHub token sent as the Authorization header
 * @returns An Octokit client that follows VS Code's network settings
 */
export async function createGitHubClient(accessToken: string): Promise<GitHubAPI> {
    const { Octokit } = await import('@octokit/rest');
    return new Octokit({
        auth: accessToken,
        userAgent: 'otak-committer',
    }) as unknown as GitHubAPI;
}

/**
 * Authenticate with GitHub and prepare the Octokit client and repository context
 *
 * @param logger - The logger used to record progress
 * @returns The Octokit client, Git repository, and parsed owner/repo for the workspace
 */
export async function initializeGitHubState(logger: Logger): Promise<GitHubInitializationResult> {
    logger.info('Initializing GitHub service');

    let authSession = await authentication.getSession('github', ['repo'], {
        createIfNone: false,
    });

    if (!authSession) {
        logger.info('No GitHub authentication session found, prompting user');
        const choice = await vscode.window.showInformationMessage(
            t('messages.githubAuthPrompt'),
            t('buttons.yes'),
            t('buttons.no'),
        );

        if (choice !== t('buttons.yes')) {
            logger.warning('User declined GitHub authentication');
            throw new Error(t('messages.authRequired'));
        }

        authSession = await authentication.getSession('github', ['repo'], {
            createIfNone: true,
        });
        if (!authSession) {
            logger.error('GitHub authentication failed');
            throw new Error(t('errors.githubAuthenticationFailed'));
        }
    }

    logger.info('GitHub authentication successful');
    const octokit = await createGitHubClient(authSession.accessToken);

    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
        logger.error('Git extension not found');
        throw new Error(t('errors.gitExtensionNotFound'));
    }
    const gitApi = gitExtension.getAPI(1) as GitExtensionAPI;
    const repository = getRepositoryForCurrentWorkspace(gitApi);
    if (!repository) {
        logger.error('No Git repository found');
        throw new Error(t('errors.noGitRepository'));
    }
    const { owner, repo } = await detectRepositoryInfo(repository, logger);

    return { octokit, repository, owner, repo };
}
