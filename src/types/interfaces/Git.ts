import { GitStatus } from '../enums/GitStatus';

/**
 * Represents a Git file change
 */
export interface GitChange {
    file: string;
    status: GitStatus;
    patch?: string;
}

/**
 * Options for Git commit operations
 */
export interface GitCommitOptions {
    message: string;
    amend?: boolean;
}

/**
 * Git configuration
 */
export interface GitConfig {
    email?: string;
    name?: string;
    remote?: string;
}

/**
 * Git error information
 */
export interface GitError {
    message: string;
    code?: string;
    command?: string;
}
