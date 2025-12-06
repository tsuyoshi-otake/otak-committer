/**
 * GitHub configuration
 */
export interface GitHubConfig {
    token?: string;
    app?: {
        appId: string;
        privateKey: string;
        installationId: string;
    };
    userAgent?: string;
}

/**
 * Parameters for creating a pull request
 */
export interface PullRequestParams {
    base: string;
    compare: string;
    title?: string;
    body?: string;
    issueNumber?: number;
    draft?: boolean;
}

/**
 * GitHub issue information
 */
export interface IssueInfo {
    number: number;
    title: string;
    body: string;
    labels: string[];
}

/**
 * Parameters for creating an issue
 */
export interface IssueParams {
    title: string;
    body: string;
    labels?: string[];
}

/**
 * Pull request diff information
 */
export interface PullRequestDiff {
    files: GitHubDiffFile[];
    stats: {
        additions: number;
        deletions: number;
    };
}

/**
 * GitHub diff file information
 */
export interface GitHubDiffFile {
    filename: string;
    additions: number;
    deletions: number;
    patch: string;
}

/**
 * Response from creating a pull request
 */
export interface CreatePullRequestResponse {
    number: number;
    html_url: string;
    draft?: boolean;
}

/**
 * GitHub error information
 */
export interface GitHubError {
    message: string;
    documentation_url?: string;
}

/**
 * GitHub error response
 */
export type GitHubErrorResponse = {
    error: GitHubError;
} | {
    errors: GitHubError[];
}

/**
 * GitHub label
 */
export interface GitHubLabel {
    name?: string;
}

/**
 * GitHub API interface
 */
export interface GitHubAPI {
    repos: {
        compareCommits: (params: {
            owner: string;
            repo: string;
            base: string;
            head: string;
        }) => Promise<GitHubCompareCommitsResponse>;
        listBranches: (params: {
            owner: string;
            repo: string;
            per_page?: number;
        }) => Promise<GitHubBranchResponse>;
    };
    issues: {
        get: (params: {
            owner: string;
            repo: string;
            issue_number: number;
        }) => Promise<GitHubIssueResponse>;
        listForRepo: (params: {
            owner: string;
            repo: string;
            state?: string;
            sort?: string;
            direction?: string;
            per_page?: number;
        }) => Promise<GitHubIssueListResponse>;
        create: (params: {
            owner: string;
            repo: string;
            title: string;
            body: string;
            labels?: string[];
        }) => Promise<GitHubCreateIssueResponse>;
    };
    pulls: {
        create: (params: {
            owner: string;
            repo: string;
            base: string;
            head: string;
            title: string;
            body: string;
            draft?: boolean;
        }) => Promise<GitHubCreatePRResponse>;
    };
}

/**
 * Internal GitHub API response types
 */
interface GitHubCreateIssueResponse {
    status: number;
    data: {
        number: number;
        html_url: string;
    };
}

interface GitHubCompareCommitsResponse {
    status: number;
    data: {
        files?: {
            filename: string;
            additions: number;
            deletions: number;
            patch?: string;
        }[];
    };
}

interface GitHubIssueResponse {
    status: number;
    data: {
        number: number;
        title: string;
        body: string | null;
        labels: (string | GitHubLabel)[];
    };
}

interface GitHubCreatePRResponse {
    status: number;
    data: {
        number: number;
        html_url: string;
    };
}

interface GitHubBranchResponse {
    status: number;
    data: {
        name: string;
    }[];
}

interface GitHubIssueListResponse {
    status: number;
    data: {
        number: number;
        title: string;
        body: string | null;
        labels: (string | GitHubLabel)[];
    }[];
}
