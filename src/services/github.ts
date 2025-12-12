import * as vscode from 'vscode';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { BaseService, BaseServiceFactory } from './base';
import {
    GitHubAPI,
    PullRequestParams,
    IssueParams,
    IssueInfo,
    PullRequestDiff,
    GitHubApiError,
    CreatePullRequestResponse,
    GitHubDiffFile,
    GitHubLabel
} from '../types';
import { authentication } from 'vscode';
import { BranchManager, BranchSelector, BranchSelection } from './branch';
import { ErrorHandler } from '../infrastructure/error';

/**
 * Service for GitHub API operations
 * 
 * Provides methods for interacting with GitHub including creating pull requests,
 * managing issues, retrieving branch information, and comparing commits.
 * 
 * @example
 * ```typescript
 * const github = await GitHubService.initialize();
 * const branches = await github.getBranches();
 * const pr = await github.createPullRequest({ base: 'main', compare: 'feature' });
 * ```
 */
export class GitHubService extends BaseService implements BranchManager {
    private octokit?: GitHubAPI;
    private owner: string = '';
    private repo: string = '';
    // Unified 200K token limit for GPT-5.2 migration
    private static readonly MAX_TOKENS = 200 * 1000;
    private initialized: boolean = false;
    private gitApi: any;

    constructor() {
        super();
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) { return; }

        try {
            this.logger.info('Initializing GitHub service');
            
            // Use VS Code's built-in GitHub authentication
            let authSession = await authentication.getSession('github', ['repo'], { createIfNone: false });

            if (!authSession) {
                this.logger.info('No GitHub authentication session found, prompting user');
                const choice = await vscode.window.showInformationMessage(
                    'GitHub operations require authentication. Please authenticate.',
                    'Yes',
                    'No'
                );

                if (choice !== 'Yes') {
                    this.logger.warning('User declined GitHub authentication');
                    throw new Error('GitHub authentication is required.');
                }

                // Execute authentication if the user agrees
                authSession = await authentication.getSession('github', ['repo'], { createIfNone: true });
                if (!authSession) {
                    this.logger.error('GitHub authentication failed');
                    throw new Error('GitHub authentication failed.');
                }
            }

            this.logger.info('GitHub authentication successful');

            // Retrieve proxy settings
            const proxyUrl = vscode.workspace.getConfiguration('http').get<string>('proxy');
            if (proxyUrl) {
                this.logger.info(`Using proxy: ${proxyUrl}`);
            }

            const { Octokit } = await import('@octokit/rest');

            // Initialize Octokit with the VS Code authentication token
            this.octokit = new Octokit({
                auth: authSession.accessToken,
                userAgent: 'otak-committer',
                ...(proxyUrl ? {
                    request: {
                        agent: new HttpsProxyAgent(proxyUrl)
                    }
                } : {})
            }) as unknown as GitHubAPI;

            // Initialize the Git API
            const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
            if (!gitExtension) {
                this.logger.error('Git extension not found');
                throw new Error('Git extension not found');
            }
            this.gitApi = gitExtension.getAPI(1);

            // Auto-detect repository information
            await this.detectRepositoryInfo();

            this.initialized = true;
            this.logger.info('GitHub service initialized successfully');

        } catch (error) {
            this.logger.error('Failed to initialize GitHub service', error);
            ErrorHandler.handle(error, {
                operation: 'Initialize GitHub service',
                component: 'GitHubService'
            });
            throw error;
        }
    }

    private async detectRepositoryInfo(): Promise<void> {
        this.logger.debug('Detecting repository information');
        const repo = this.gitApi.repositories[0];
        if (!repo) {
            this.logger.error('No Git repository found');
            throw new Error('No Git repository found');
        }

        // Extract owner/repo from the remote URL
        const remoteUrl = await repo.getConfig('remote.origin.url');
        if (!remoteUrl) {
            this.logger.error('No remote origin URL found');
            throw new Error('No remote origin URL found');
        }

        const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)(?:\.git)?$/);
        if (!match) {
            this.logger.error(`Unable to parse GitHub repository from URL: ${remoteUrl}`);
            throw new Error('Unable to parse GitHub repository information from remote URL');
        }

        [, this.owner, this.repo] = match;
        this.logger.info(`Detected repository: ${this.owner}/${this.repo}`);
    }

    /**
     * Get the current Git branch name
     * 
     * @returns The current branch name or undefined if not available
     */
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

    /**
     * Prompt user to select base and compare branches
     * 
     * @returns Branch selection or undefined if cancelled
     */
    static async selectBranches(): Promise<BranchSelection | undefined> {
        const service = await GitHubServiceFactory.initialize();
        return service ? BranchSelector.selectBranches(service) : undefined;
    }

    /**
     * Get detailed diff between two branches
     * 
     * Retrieves file changes, additions, deletions, and patches between branches.
     * Automatically truncates large diffs to stay within token limits.
     * 
     * @param base - The base branch name
     * @param compare - The compare branch name
     * @returns Pull request diff information
     * 
     * @example
     * ```typescript
     * const diff = await github.getBranchDiffDetails('main', 'feature');
     * console.log(`${diff.files.length} files changed`);
     * ```
     */
    async getBranchDiffDetails(base: string, compare: string): Promise<PullRequestDiff> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            this.logger.info(`Getting diff between ${base} and ${compare}`);
            
            const response = await this.octokit.repos.compareCommits({
                owner: this.owner,
                repo: this.repo,
                base,
                head: compare
            });

            if (response.status !== 200 || !response.data.files) {
                this.logger.error(`Failed to get diff: status ${response.status}`);
                throw new GitHubApiError(
                    'Failed to get diff',
                    response.status
                );
            }

            let totalTokens = 0;
            const files: GitHubDiffFile[] = response.data.files.map(file => ({
                filename: file.filename,
                additions: file.additions,
                deletions: file.deletions,
                patch: file.patch || '',
            }));

            this.logger.info(`Retrieved diff for ${files.length} files`);

            // Calculate the total size of patches (approximation: 1 token ≈ 4 characters)
            for (const file of files) {
                totalTokens += Math.ceil(file.patch.length / 4);
            }

            // Truncate patches if the size limit is exceeded
            if (totalTokens > GitHubService.MAX_TOKENS) {
                this.logger.warning(`Diff size (${totalTokens} tokens) exceeds limit (${GitHubService.MAX_TOKENS}), truncating`);
                const ratio = GitHubService.MAX_TOKENS / totalTokens;
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
                    deletions: files.reduce((sum: number, file: GitHubDiffFile) => sum + file.deletions, 0)
                }
            };
        } catch (error) {
            this.logger.error('Failed to get branch diff details', error);
            this.handleError(error);
        }
    }

    /**
     * Get a specific GitHub issue by number
     * 
     * @param number - The issue number
     * @returns Issue information
     * 
     * @example
     * ```typescript
     * const issue = await github.getIssue(42);
     * console.log(issue.title);
     * ```
     */
    async getIssue(number: number): Promise<IssueInfo> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            this.logger.info(`Getting issue #${number}`);
            
            const response = await this.octokit.issues.get({
                owner: this.owner,
                repo: this.repo,
                issue_number: number
            });

            if (response.status !== 200) {
                this.logger.error(`Failed to get issue: status ${response.status}`);
                throw new GitHubApiError('Failed to get issue', response.status);
            }

            this.logger.info(`Retrieved issue #${number}: ${response.data.title}`);
            return {
                number: response.data.number,
                title: response.data.title,
                body: response.data.body || '',
                labels: response.data.labels.map((label: string | GitHubLabel) =>
                    typeof label === 'string' ? label : label.name || ''
                )
            };
        } catch (error) {
            this.logger.error(`Failed to get issue #${number}`, error);
            this.handleError(error);
        }
    }

    /**
     * Create a pull request on GitHub
     * 
     * Creates a new pull request with the specified parameters.
     * Optionally links to an existing issue.
     * 
     * @param params - Pull request parameters
     * @returns Created pull request information
     * 
     * @example
     * ```typescript
     * const pr = await github.createPullRequest({
     *   base: 'main',
     *   compare: 'feature',
     *   title: 'Add new feature',
     *   body: 'Description...',
     *   draft: false
     * });
     * console.log(`PR #${pr.number} created`);
     * ```
     */
    async createPullRequest(params: PullRequestParams): Promise<CreatePullRequestResponse> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            this.logger.info(`Creating pull request from ${params.compare} to ${params.base}`);
            
            let title = params.title;
            let body = params.body;

            if (params.issueNumber) {
                this.logger.info(`Linking to issue #${params.issueNumber}`);
                const issue = await this.getIssue(params.issueNumber);
                title = title || issue.title;
                body = body || `Closes #${issue.number}\n\n${issue.body}`;
            }

            const diff = await this.getBranchDiffDetails(params.base, params.compare);
            if (diff.files.length === 0) {
                this.logger.warning('No changes found for pull request');
                throw new Error('No changes to create a pull request');
            }

            const response = await this.octokit.pulls.create({
                owner: this.owner,
                repo: this.repo,
                base: params.base,
                head: params.compare,
                title: title || 'Pull Request',
                body: body || '',
                draft: params.draft || false
            });

            if (response.status !== 201) {
                this.logger.error(`Failed to create pull request: status ${response.status}`);
                throw new GitHubApiError('Failed to create pull request', response.status);
            }

            this.logger.info(`Pull request #${response.data.number} created successfully`);
            return {
                number: response.data.number,
                html_url: response.data.html_url,
                draft: params.draft || false
            };
        } catch (error) {
            if (error instanceof Error && error.message === 'No changes to create a pull request') {
                throw error;
            }
            this.logger.error('Failed to create pull request', error);
            this.handleError(error);
        }
    }

    /**
     * Create a GitHub issue
     * 
     * @param params - Issue parameters
     * @returns Created issue information
     * 
     * @example
     * ```typescript
     * const issue = await github.createIssue({
     *   title: 'Bug report',
     *   body: 'Description...',
     *   labels: ['bug']
     * });
     * ```
     */
    async createIssue(params: IssueParams): Promise<{ number: number; html_url: string }> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            this.logger.info(`Creating issue: ${params.title}`);
            
            const response = await this.octokit.issues.create({
                owner: this.owner,
                repo: this.repo,
                title: params.title,
                body: params.body,
                labels: params.labels
            });

            if (response.status !== 201) {
                this.logger.error(`Failed to create issue: status ${response.status}`);
                throw new GitHubApiError('Failed to create issue', response.status);
            }

            this.logger.info(`Issue #${response.data.number} created successfully`);
            return {
                number: response.data.number,
                html_url: response.data.html_url
            };
        } catch (error) {
            this.logger.error('Failed to create issue', error);
            this.handleError(error);
        }
    }

    /**
     * Get all branches in the repository
     * 
     * @returns Array of branch names
     * 
     * @example
     * ```typescript
     * const branches = await github.getBranches();
     * console.log(`Found ${branches.length} branches`);
     * ```
     */
    async getBranches(): Promise<string[]> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            this.logger.debug('Getting branches');
            
            const response = await this.octokit.repos.listBranches({
                owner: this.owner,
                repo: this.repo,
                per_page: 100
            });

            if (response.status !== 200) {
                this.logger.error(`Failed to get branches: status ${response.status}`);
                throw new GitHubApiError('Failed to get branches', response.status);
            }

            const branches = response.data.map(branch => branch.name);
            this.logger.info(`Retrieved ${branches.length} branches`);
            return branches;
        } catch (error) {
            this.logger.error('Failed to get branches', error);
            this.handleError(error);
        }
    }

    /**
     * Get all open issues in the repository
     * 
     * @returns Array of issue information
     * 
     * @example
     * ```typescript
     * const issues = await github.getIssues();
     * issues.forEach(issue => console.log(`#${issue.number}: ${issue.title}`));
     * ```
     */
    async getIssues(): Promise<IssueInfo[]> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            this.logger.debug('Getting issues');
            
            const response = await this.octokit.issues.listForRepo({
                owner: this.owner,
                repo: this.repo,
                state: 'open',
                sort: 'updated',
                direction: 'desc',
                per_page: 100
            });

            if (response.status !== 200) {
                this.logger.error(`Failed to get issues: status ${response.status}`);
                throw new GitHubApiError('Failed to get issues', response.status);
            }

            const issues = response.data
                .filter(item => !('pull_request' in item))
                .map(issue => ({
                    number: issue.number,
                    title: issue.title,
                    body: issue.body || '',
                    labels: (issue.labels || []).map((label: string | GitHubLabel) =>
                        typeof label === 'string' ? label : label.name || ''
                    )
                }));
            
            this.logger.info(`Retrieved ${issues.length} open issues`);
            return issues;
        } catch (error) {
            this.logger.error('Failed to get issues', error);
            this.handleError(error);
        }
    }
}

/**
 * Factory for creating GitHub service instances
 * 
 * Handles service initialization and GitHub authentication.
 */
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
                component: 'GitHubServiceFactory'
            });
            return undefined;
        }
    }
}
