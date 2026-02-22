import { BaseService, BaseServiceFactory } from './base';
import {
    CreatePullRequestResponse,
    GitHubAPI,
    IssueInfo,
    IssueParams,
    PullRequestDiff,
    PullRequestParams,
} from '../types';
import { BranchManager, BranchSelector, BranchSelection } from './branch';
import { ErrorHandler } from '../infrastructure/error';
import { getBranchDiffDetails, isNoCommitsBetweenBranchesError } from './github.diff';
import { createIssue, getIssue, getIssues } from './github.issues';
import { createPullRequest } from './github.pulls';
import { getBranches } from './github.branches';
import { GitExtensionAPI, initializeGitHubState } from './github.init';

export class GitHubService extends BaseService implements BranchManager {
    private static readonly GITHUB_PAGE_SIZE = 100;
    private octokit?: GitHubAPI;
    private owner = '';
    private repo = '';
    private initialized = false;
    private gitApi!: GitExtensionAPI;

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const initializedState = await initializeGitHubState(this.logger);
            this.octokit = initializedState.octokit;
            this.gitApi = initializedState.gitApi;
            this.owner = initializedState.owner;
            this.repo = initializedState.repo;
            this.initialized = true;
            this.logger.info('GitHub service initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize GitHub service', error);
            ErrorHandler.handle(error, {
                operation: 'Initialize GitHub service',
                component: 'GitHubService',
            });
            throw error;
        }
    }

    async getCurrentBranch(): Promise<string | undefined> {
        await this.ensureInitialized();
        const repo = this.gitApi.repositories[0];
        if (!repo) {
            this.logger.warning('No repository found when getting current branch');
            return undefined;
        }
        const branchName = repo.state.HEAD?.name;
        this.logger.debug(`Current branch: ${branchName}`);
        return branchName;
    }

    static async selectBranches(): Promise<BranchSelection | undefined> {
        const service = await GitHubServiceFactory.initialize();
        return service ? BranchSelector.selectBranches(service) : undefined;
    }

    async getBranchDiffDetails(base: string, compare: string): Promise<PullRequestDiff> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            return await getBranchDiffDetails(
                this.octokit,
                this.owner,
                this.repo,
                base,
                compare,
                this.logger,
            );
        } catch (error) {
            this.logger.error('Failed to get branch diff details', error);
            this.handleErrorAndRethrow(error);
        }
    }

    async getIssue(number: number): Promise<IssueInfo> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            return await getIssue(this.octokit, this.owner, this.repo, number, this.logger);
        } catch (error) {
            this.logger.error(`Failed to get issue #${number}`, error);
            this.handleErrorAndRethrow(error);
        }
    }

    async createPullRequest(params: PullRequestParams): Promise<CreatePullRequestResponse> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            return await createPullRequest(this.octokit, this.owner, this.repo, params, this.logger);
        } catch (error: unknown) {
            if (isNoCommitsBetweenBranchesError(error)) {
                throw new Error('No changes to create a pull request');
            }

            this.logger.error('Failed to create pull request', error);
            this.handleErrorAndRethrow(error);
        }
    }

    async createIssue(params: IssueParams): Promise<{ number: number; html_url: string }> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            return await createIssue(this.octokit, this.owner, this.repo, params, this.logger);
        } catch (error) {
            this.logger.error('Failed to create issue', error);
            this.handleErrorAndRethrow(error);
        }
    }

    async getBranches(): Promise<string[]> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            return await getBranches(
                this.octokit,
                this.owner,
                this.repo,
                GitHubService.GITHUB_PAGE_SIZE,
                this.logger,
            );
        } catch (error) {
            this.logger.error('Failed to get branches', error);
            this.handleErrorAndRethrow(error);
        }
    }

    async getIssues(): Promise<IssueInfo[]> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            return await getIssues(
                this.octokit,
                this.owner,
                this.repo,
                GitHubService.GITHUB_PAGE_SIZE,
                this.logger,
            );
        } catch (error) {
            this.logger.error('Failed to get issues', error);
            this.handleErrorAndRethrow(error);
        }
    }
}

export class GitHubServiceFactory extends BaseServiceFactory<GitHubService> {
    async create(): Promise<GitHubService> {
        return new GitHubService();
    }

    static async initialize(): Promise<GitHubService | undefined> {
        try {
            const factory = new GitHubServiceFactory();
            return await factory.create();
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'Initialize GitHub service',
                component: 'GitHubServiceFactory',
            });
            return undefined;
        }
    }
}
