import { GitHubAPI } from './GitHub';

/**
 * Issue type configuration
 */
export interface IssueType {
    label: string;
    description: string;
    type: 'task' | 'bug' | 'feature' | 'docs' | 'refactor';
}

/**
 * Parameters for issue generation
 */
export interface IssueGenerationParams {
    type: IssueType;
    description: string;
    files?: string[];
}

/**
 * Generated issue content
 */
export interface GeneratedIssueContent {
    title: string;
    body: string;
}

/**
 * Dependencies for issue generator
 */
export interface IssueGeneratorDependencies {
    openai: {
        openai: GitHubAPI;
    };
    github: GitHubAPI;
    git: {
        getTrackedFiles(): Promise<string[]>;
    };
}
