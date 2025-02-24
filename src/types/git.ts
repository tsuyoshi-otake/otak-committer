export interface GitChange {
    file: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
    patch?: string;
}

export interface GitCommitOptions {
    message: string;
    amend?: boolean;
}

export interface GitConfig {
    email?: string;
    name?: string;
    remote?: string;
}

export interface GitError {
    message: string;
    code?: string;
    command?: string;
}

export class GitOperationError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly command?: string
    ) {
        super(message);
        this.name = 'GitOperationError';
    }
}