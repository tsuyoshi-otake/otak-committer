import * as vscode from 'vscode';
import { authentication } from 'vscode';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { t } from '../i18n';
import { GitHubAPI } from '../types';
import { Logger } from '../infrastructure/logging/Logger';

export interface GitExtensionAPI {
    repositories: Array<{
        state: { HEAD?: { name?: string } };
        getConfig(key: string): Promise<string | undefined>;
    }>;
}

export interface GitHubInitializationResult {
    octokit: GitHubAPI;
    gitApi: GitExtensionAPI;
    owner: string;
    repo: string;
}

async function detectRepositoryInfo(gitApi: GitExtensionAPI, logger: Logger): Promise<{
    owner: string;
    repo: string;
}> {
    logger.debug('Detecting repository information');
    const repo = gitApi.repositories[0];
    if (!repo) {
        logger.error('No Git repository found');
        throw new Error('No Git repository found');
    }

    const remoteUrl = await repo.getConfig('remote.origin.url');
    if (!remoteUrl) {
        logger.error('No remote origin URL found');
        throw new Error('No remote origin URL found');
    }

    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)(?:\.git)?$/);
    if (!match) {
        logger.error(`Unable to parse GitHub repository from URL: ${remoteUrl}`);
        throw new Error('Unable to parse GitHub repository information from remote URL');
    }

    const [, owner, repoName] = match;
    logger.info(`Detected repository: ${owner}/${repoName}`);
    return { owner, repo: repoName };
}

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
            throw new Error('GitHub authentication is required.');
        }

        authSession = await authentication.getSession('github', ['repo'], {
            createIfNone: true,
        });
        if (!authSession) {
            logger.error('GitHub authentication failed');
            throw new Error('GitHub authentication failed.');
        }
    }

    logger.info('GitHub authentication successful');
    const proxyUrl = vscode.workspace.getConfiguration('http').get<string>('proxy');
    if (proxyUrl) {
        logger.info(`Using proxy: ${proxyUrl}`);
    }

    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({
        auth: authSession.accessToken,
        userAgent: 'otak-committer',
        ...(proxyUrl
            ? {
                  request: {
                      agent: new HttpsProxyAgent(proxyUrl),
                  },
              }
            : {}),
    }) as unknown as GitHubAPI;

    const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    if (!gitExtension) {
        logger.error('Git extension not found');
        throw new Error('Git extension not found');
    }
    const gitApi = gitExtension.getAPI(1) as GitExtensionAPI;
    const { owner, repo } = await detectRepositoryInfo(gitApi, logger);

    return { octokit, gitApi, owner, repo };
}
