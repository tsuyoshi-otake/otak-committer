import * as vscode from 'vscode';
import { HttpsProxyAgent } from 'https-proxy-agent';
import {
    GitHubConfig,
    GitHubAPI,
    PullRequestParams,
    IssueInfo,
    PullRequestDiff,
    GitHubApiError,
    CreatePullRequestResponse,
    GitHubDiffFile,
    GitHubLabel
} from '../types/github';

const DEFAULT_BASE_BRANCHES = ['develop', 'main', 'master'];

export class GitHubService {
    private octokit?: GitHubAPI;
    private owner: string = '';
    private repo: string = '';
    private initialized: boolean = false;
    private gitApi: any;

    constructor(private token: string) {}

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) return;

        // プロキシ設定の取得
        const proxyUrl = vscode.workspace.getConfiguration('http').get<string>('proxy');
        
        const { Octokit } = await import('@octokit/rest');
        this.octokit = new Octokit({
            auth: this.token,
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

    /**
     * Git設定からリポジトリ情報を検出
     */
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

    /**
     * 現在のブランチ名を取得
     */
    async getCurrentBranch(): Promise<string | undefined> {
        await this.ensureInitialized();
        const repo = this.gitApi.repositories[0];
        if (!repo) {
            return undefined;
        }
        return repo.state.HEAD?.name;
    }

    /**
     * GitHub認証トークンの設定を促す
     */
    static async showGitHubTokenPrompt(): Promise<boolean> {
        const response = await vscode.window.showWarningMessage(
            'GitHub token is not configured. Would you like to configure it now?',
            'Yes',
            'No'
        );

        if (response === 'Yes') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'otakCommitter.github');
            return true;
        }
        return false;
    }

    /**
     * GitHubクライアントの初期化
     */
    static async initializeGitHubClient(): Promise<GitHubService | undefined> {
        const config = vscode.workspace.getConfiguration('otakCommitter.github');
        const token = config.get<string>('token');

        if (!token) {
            await GitHubService.showGitHubTokenPrompt();
            return undefined;
        }

        return new GitHubService(token);
    }

    /**
     * ブランチをソート（develop, main, master を優先）
     */
    private static sortBranches(branches: string[], currentBranch?: string): vscode.QuickPickItem[] {
        return branches
            .map(branch => ({
                label: branch,
                description: branch === currentBranch ? '(current)' : undefined,
                // デフォルトブランチの優先度を設定
                sortOrder: DEFAULT_BASE_BRANCHES.indexOf(branch)
            }))
            .sort((a, b) => {
                // デフォルトブランチを優先
                if (a.sortOrder !== -1 || b.sortOrder !== -1) {
                    return (a.sortOrder === -1 ? 999 : a.sortOrder) - (b.sortOrder === -1 ? 999 : b.sortOrder);
                }
                return a.label.localeCompare(b.label);
            });
    }

    /**
     * ブランチ選択UI
     */
    static async selectBranches(): Promise<{ base: string; compare: string } | undefined> {
        const github = await GitHubService.initializeGitHubClient();
        if (!github) {
            return undefined;
        }

        const branches = await github.getBranches();
        const currentBranch = await github.getCurrentBranch();

        // baseブランチの選択（develop, main, masterを優先）
        const baseItems = this.sortBranches(
            branches.filter(b => b !== currentBranch)
        );
        
        const baseItem = await vscode.window.showQuickPick(baseItems, {
            placeHolder: 'Select base branch'
        });

        if (!baseItem) {
            return undefined;
        }

        // compareブランチの選択（現在のブランチを優先）
        const compareItems = branches
            .filter(branch => branch !== baseItem.label)
            .map(branch => ({
                label: branch,
                description: branch === currentBranch ? '(current)' : undefined
            }))
            .sort((a, b) => {
                if (a.label === currentBranch) return -1;
                if (b.label === currentBranch) return 1;
                return a.label.localeCompare(b.label);
            });

        const compareItem = await vscode.window.showQuickPick(compareItems, {
            placeHolder: 'Select compare branch'
        });

        if (!compareItem) {
            return undefined;
        }

        return {
            base: baseItem.label,
            compare: compareItem.label
        };
    }

    /**
     * 指定されたブランチ間の詳細な差分を取得
     */
    async getBranchDiffDetails(base: string, compare: string): Promise<PullRequestDiff> {
        await this.ensureInitialized();
        if (!this.octokit) {
            throw new Error('GitHub client not initialized');
        }

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
        } catch (error: any) {
            throw new GitHubApiError(
                `Failed to get diff: ${error.message}`,
                error.status,
                error.response?.data
            );
        }
    }

    /**
     * Issue情報を取得
     */
    async getIssue(number: number): Promise<IssueInfo> {
        await this.ensureInitialized();
        if (!this.octokit) {
            throw new Error('GitHub client not initialized');
        }

        try {
            const response = await this.octokit.issues.get({
                owner: this.owner,
                repo: this.repo,
                issue_number: number
            });

            if (response.status !== 200) {
                throw new GitHubApiError(
                    'Failed to get issue',
                    response.status
                );
            }

            return {
                number: response.data.number,
                title: response.data.title,
                body: response.data.body || '',
                labels: response.data.labels.map((label: string | GitHubLabel) => 
                    typeof label === 'string' ? label : label.name || ''
                )
            };
        } catch (error: any) {
            throw new GitHubApiError(
                `Failed to get issue: ${error.message}`,
                error.status,
                error.response?.data
            );
        }
    }

    /**
     * PRを作成
     */
    async createPullRequest(params: PullRequestParams): Promise<CreatePullRequestResponse> {
        await this.ensureInitialized();
        if (!this.octokit) {
            throw new Error('GitHub client not initialized');
        }

        try {
            // Issue関連付けがある場合は、タイトルと本文を取得
            let title = params.title;
            let body = params.body;

            if (params.issueNumber) {
                const issue = await this.getIssue(params.issueNumber);
                title = title || issue.title;
                body = body || `Closes #${issue.number}\n\n${issue.body}`;
            }

            // 差分の確認
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
                throw new GitHubApiError(
                    'Failed to create pull request',
                    response.status
                );
            }

            return {
                number: response.data.number,
                html_url: response.data.html_url
            };
        } catch (error: any) {
            if (error.message === 'No changes to create a pull request') {
                throw new Error(error.message);
            }
            throw new GitHubApiError(
                `Failed to create pull request: ${error.message}`,
                error.status,
                error.response?.data
            );
        }
    }

    /**
     * リポジトリのブランチ一覧を取得
     */
    async getBranches(): Promise<string[]> {
        await this.ensureInitialized();
        if (!this.octokit) {
            throw new Error('GitHub client not initialized');
        }

        try {
            const response = await this.octokit.repos.listBranches({
                owner: this.owner,
                repo: this.repo,
                per_page: 100
            });

            if (response.status !== 200) {
                throw new GitHubApiError(
                    'Failed to get branches',
                    response.status
                );
            }

            return response.data.map(branch => branch.name);
        } catch (error: any) {
            throw new GitHubApiError(
                `Failed to get branches: ${error.message}`,
                error.status,
                error.response?.data
            );
        }
    }

    /**
     * リポジトリのIssue一覧を取得（PRは除外）
     */
    async getIssues(): Promise<IssueInfo[]> {
        await this.ensureInitialized();
        if (!this.octokit) {
            throw new Error('GitHub client not initialized');
        }

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
                throw new GitHubApiError(
                    'Failed to get issues',
                    response.status
                );
            }

            // pull_requestフィールドを持つものを除外（PRs）
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
        } catch (error: any) {
            throw new GitHubApiError(
                `Failed to get issues: ${error.message}`,
                error.status,
                error.response?.data
            );
        }
    }
}