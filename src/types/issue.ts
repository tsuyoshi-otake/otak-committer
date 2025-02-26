import { GitHubAPI } from './github';

export interface IssueType {
    label: string;
    description: string;
    type: 'task' | 'bug' | 'feature' | 'docs' | 'refactor';
}

export interface IssueGenerationParams {
    type: IssueType;
    description: string;
    files?: string[];
}

export interface GeneratedIssueContent {
    title: string;
    body: string;
}

export interface IssueGeneratorDependencies {
    openai: {
        openai: GitHubAPI;
    };
    github: GitHubAPI;
    git: {
        getTrackedFiles(): Promise<string[]>;
    };
}