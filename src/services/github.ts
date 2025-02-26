import * as vscode from 'vscode';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { BaseService, BaseServiceFactory } from './base';
import {
    ServiceConfig,
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

import { BranchManager, BranchSelector, BranchSelection } from './branch';

export class GitHubService extends BaseService implements BranchManager {
    private octokit?: GitHubAPI;
    private owner: string = '';
    private repo: string = '';
    private initialized: boolean = false;
    private gitApi: any;

    constructor(config?: Partial<ServiceConfig>) {
        super(config);
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) {return;}

        const hasToken = await this.ensureConfig(
            'githubToken',
            'GitHub token is not configured. Would you like to configure it now?'
        );
        if (!hasToken) {
            throw new Error('GitHub token is required');
        }

        // プロキシ設定の取得
        const proxyUrl = vscode.workspace.getConfiguration('http').get<string>('proxy');
        
        const { Octokit } = await import('@octokit/rest');
        this.octokit = new Octokit({
            auth: this.config.githubToken,
            userAgent: 'otak-committer',
            ...(proxyUrl ? {
                request: {
                    agent: new HttpsProxyAgent(proxyUrl)
                }
            } : {})
        }) as unknown as GitHubAPI;

        // Git APIの初期化
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
            throw new Error('Git extension not found');
        }
        this.gitApi = gitExtension.getAPI(1);

        // リポジトリ情報の自動検出
        await this.detectRepositoryInfo();
        
        this.initialized = true;
    }

    private async detectRepositoryInfo(): Promise<void> {
        const repo = this.gitApi.repositories[0];
        if (!repo) {
            throw new Error('No Git repository found');
        }

        // リモートURLからowner/repoを抽出
        const remoteUrl = await repo.getConfig('remote.origin.url');
        if (!remoteUrl) {
            throw new Error('No remote origin URL found');
        }

        const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)(?:\.git)?$/);
        if (!match) {
            throw new Error('Unable to parse GitHub repository information from remote URL');
        }

        [, this.owner, this.repo] = match;
    }

    async getCurrentBranch(): Promise<string | undefined> {
        await this.ensureInitialized();
        const repo = this.gitApi.repositories[0];
        if (!repo) {
            return undefined;
        }
        return repo.state.HEAD?.name;
    }

    static async selectBranches(): Promise<BranchSelection | undefined> {
        const service = await GitHubServiceFactory.initialize();
        return service ? BranchSelector.selectBranches(service) : undefined;
    }

    async getBranchDiffDetails(base: string, compare: string): Promise<PullRequestDiff> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            const response = await this.octokit.repos.compareCommits({
                owner: this.owner,
                repo: this.repo,
                base,
                head: compare
            });

            if (response.status !== 200 || !response.data.files) {
                throw new GitHubApiError(
                    'Failed to get diff',
                    response.status
                );
            }

            const files: GitHubDiffFile[] = response.data.files.map(file => ({
                filename: file.filename,
                additions: file.additions,
                deletions: file.deletions,
                patch: file.patch || ''
            }));

            return {
                files,
                stats: {
                    additions: files.reduce((sum: number, file: GitHubDiffFile) => sum + file.additions, 0),
                    deletions: files.reduce((sum: number, file: GitHubDiffFile) => sum + file.deletions, 0)
                }
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async getIssue(number: number): Promise<IssueInfo> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            const response = await this.octokit.issues.get({
                owner: this.owner,
                repo: this.repo,
                issue_number: number
            });

            if (response.status !== 200) {
                throw new GitHubApiError('Failed to get issue', response.status);
            }

            return {
                number: response.data.number,
                title: response.data.title,
                body: response.data.body || '',
                labels: response.data.labels.map((label: string | GitHubLabel) => 
                    typeof label === 'string' ? label : label.name || ''
                )
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async createPullRequest(params: PullRequestParams): Promise<CreatePullRequestResponse> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            let title = params.title;
            let body = params.body;

            if (params.issueNumber) {
                const issue = await this.getIssue(params.issueNumber);
                title = title || issue.title;
                body = body || `Closes #${issue.number}\n\n${issue.body}`;
            }

            const diff = await this.getBranchDiffDetails(params.base, params.compare);
            if (diff.files.length === 0) {
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
                throw new GitHubApiError('Failed to create pull request', response.status);
            }

            return {
                number: response.data.number,
                html_url: response.data.html_url,
                draft: params.draft || false
            };
        } catch (error) {
            if (error instanceof Error && error.message === 'No changes to create a pull request') {
                throw error;
            }
            this.handleError(error);
        }
    }

    async createIssue(params: IssueParams): Promise<{ number: number; html_url: string }> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            const response = await this.octokit.issues.create({
                owner: this.owner,
                repo: this.repo,
                title: params.title,
                body: params.body,
                labels: params.labels
            });

            if (response.status !== 201) {
                throw new GitHubApiError('Failed to create issue', response.status);
            }

            return {
                number: response.data.number,
                html_url: response.data.html_url
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async getBranches(): Promise<string[]> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            const response = await this.octokit.repos.listBranches({
                owner: this.owner,
                repo: this.repo,
                per_page: 100
            });

            if (response.status !== 200) {
                throw new GitHubApiError('Failed to get branches', response.status);
            }

            return response.data.map(branch => branch.name);
        } catch (error) {
            this.handleError(error);
        }
    }

    async getIssues(): Promise<IssueInfo[]> {
        await this.ensureInitialized();
        this.validateState(!!this.octokit, 'GitHub client not initialized');

        try {
            const response = await this.octokit.issues.listForRepo({
                owner: this.owner,
                repo: this.repo,
                state: 'open',
                sort: 'updated',
                direction: 'desc',
                per_page: 100
            });

            if (response.status !== 200) {
                throw new GitHubApiError('Failed to get issues', response.status);
            }

            return response.data
                .filter(item => !('pull_request' in item))
                .map(issue => ({
                    number: issue.number,
                    title: issue.title,
                    body: issue.body || '',
                    labels: (issue.labels || []).map((label: string | GitHubLabel) => 
                        typeof label === 'string' ? label : label.name || ''
                    )
                }));
        } catch (error) {
            this.handleError(error);
        }
    }
}

export class GitHubServiceFactory extends BaseServiceFactory<GitHubService> {
    async create(config?: Partial<ServiceConfig>): Promise<GitHubService> {
        return new GitHubService(config);
    }

    static async initialize(config?: Partial<ServiceConfig>): Promise<GitHubService | undefined> {
        try {
            const factory = new GitHubServiceFactory();
            return await factory.create(config);
        } catch (error) {
            console.error('Failed to initialize GitHub service:', error);
            vscode.window.showErrorMessage(
                error instanceof Error 
                    ? error.message 
                    : 'Failed to initialize GitHub service'
            );
            return undefined;
        }
    }
}