export interface GitHubConfig {
    token?: string;
    app?: {
        appId: string;
        privateKey: string;
        installationId: string;
    };
    userAgent?: string;
}

export interface PullRequestParams {
    base: string;
    compare: string;
    title?: string;
    body?: string;
    issueNumber?: number;
    draft?: boolean;
}

export interface IssueInfo {
    number: number;
    title: string;
    body: string;
    labels: string[];
}

export interface IssueParams {
    title: string;
    body: string;
    labels?: string[];
}

interface GitHubCreateIssueResponse {
    status: number;
    data: {
        number: number;
        html_url: string;
    };
}

export interface PullRequestDiff {
    files: GitHubDiffFile[];
    stats: {
        additions: number;
        deletions: number;
    };
}

export interface GitHubDiffFile {
    filename: string;
    additions: number;
    deletions: number;
    patch: string;
}

export interface CreatePullRequestResponse {
    number: number;
    html_url: string;
    draft?: boolean;
}

export interface GitHubError {
    message: string;
    documentation_url?: string;
}

export type GitHubErrorResponse = {
    error: GitHubError;
} | {
    errors: GitHubError[];
}

export class GitHubApiError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly response?: GitHubErrorResponse
    ) {
        super(message);
        this.name = 'GitHubApiError';
    }
}

export interface GitHubLabel {
    name?: string;
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