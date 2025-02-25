import * as vscode from 'vscode';
import { OpenAIService } from './openai';
import { GitService } from './git';
import { GitHubService } from './github';

interface IssueType {
    label: string;
    description: string;
    type: 'task' | 'bug' | 'feature' | 'docs' | 'refactor';
}

interface IssueGenerationParams {
    type: IssueType;
    description: string;
    files?: string[];
}

export interface GeneratedIssueContent {
    title: string;
    body: string;
}

export class IssueGeneratorService {
    protected git: GitService;

    constructor(
        private openai: OpenAIService,
        private github: GitHubService,
        git: GitService
    ) {
        this.git = git;
    }

    static async initialize(): Promise<IssueGeneratorService | undefined> {
        try {
            const git = await GitService.initialize();
            const github = await GitHubService.initializeGitHubClient();
            const openai = await OpenAIService.initialize();

            if (!git || !github || !openai) {
                return undefined;
            }

            return new IssueGeneratorService(openai, github, git);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to initialize Issue Generator: ${error.message}`);
            return undefined;
        }
    }

    async getTrackedFiles(): Promise<string[]> {
        return await this.git.getTrackedFiles();
    }

    getAvailableTypes(): IssueType[] {
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const useEmoji = config.get<boolean>('useEmoji') || false;

        return [
            {
                label: useEmoji ? '📋 Task' : 'Task',
                description: 'General task or improvement',
                type: 'task'
            },
            {
                label: useEmoji ? '🐛 Bug Report' : 'Bug Report',
                description: 'Report a bug',
                type: 'bug'
            },
            {
                label: useEmoji ? '✨ Feature Request' : 'Feature Request',
                description: 'Request a new feature',
                type: 'feature'
            },
            {
                label: useEmoji ? '📝 Documentation' : 'Documentation',
                description: 'Documentation improvement',
                type: 'docs'
            },
            {
                label: useEmoji ? '🔧 Refactoring' : 'Refactoring',
                description: 'Code improvement',
                type: 'refactor'
            }
        ];
    }

    private async generateTitle(type: string, description: string): Promise<string> {
        const response = await this.openai.openai.chat.completions.create({
            model: 'chatgpt-4o-latest',
            messages: [{
                role: 'user',
                content: `Create a concise English title (maximum 50 characters) for this ${type} based on the following description:\n\n${description}\n\nRequirements:\n- Must be in English\n- Maximum 50 characters\n- Clear and descriptive\n- No technical jargon unless necessary`
            }],
            temperature: 0.1,
            max_tokens: 50
        });

        return response.choices[0].message.content?.trim() || description.slice(0, 50);
    }

    private async analyzeRepository(selectedFiles?: string[]): Promise<string> {
        const files = selectedFiles || await this.git.getTrackedFiles();

        // Create directory structure
        const directoryStructure: { [key: string]: string[] } = {};
        files
            .filter(file => !file.includes('node_modules') && 
                          !file.includes('dist') && 
                          !file.includes('build') &&
                          !file.includes('.git'))
            .forEach(file => {
                const parts = file.split('/');
                if (parts.length > 1) {
                    const topDir = parts[0];
                    if (parts.length === 2) {
                        if (!directoryStructure[topDir]) {
                            directoryStructure[topDir] = [];
                        }
                        directoryStructure[topDir].push(parts[1]);
                    } else if (parts.length > 2) {
                        const subDir = `${parts[0]}/${parts[1]}`;
                        if (!directoryStructure[subDir]) {
                            directoryStructure[subDir] = [];
                        }
                        if (parts.length === 3) {
                            directoryStructure[subDir].push(parts[2]);
                        }
                    }
                }
            });

        return Object.entries(directoryStructure)
            .map(([dir, files]) => `${dir}/\n${files.map(f => `  - ${f}`).join('\n')}`)
            .join('\n\n');
    }

    private getTemplateForType(type: string): string {
        return type === 'task' 
            ? this.getTaskTemplate() 
            : this.getStandardTemplate();
    }

    private getTaskTemplate(): string {
        return `Please provide output in the following format:

### Purpose
[Task purpose and background]

### Task Details
- [Specific task 1]
- [Specific task 2]
...

### Completion Criteria
- [ ] [Criteria 1]
- [ ] [Criteria 2]
...

### Related Information
- Impact: [Affected components and features]
- Dependencies: [Dependencies on other tasks or issues]
- Priority: [High/Medium/Low]
- Estimated Time: [Expected completion time]

### Additional Context
- [Other important information]
- [References and links]`;
    }

    private getStandardTemplate(): string {
        return `Please provide output in the following format:

### Description
[Detailed explanation based on user description]

### Steps to Reproduce (for bugs) or Implementation Details (for features)
1. [Step 1]
2. [Step 2]
...

### Expected Behavior
[Expected behavior or outcome]

### Current Behavior (for bugs)
[Current behavior or issue]

### Technical Details
- Affected Files
- Related Components
- Proposed Changes

### Additional Context
- Environment Information
- Related Settings
- Other Important Information

### Checklist
- [ ] Documentation update required
- [ ] Tests addition/update required
- [ ] Breaking changes included`;
    }

    async generatePreview(params: IssueGenerationParams): Promise<GeneratedIssueContent> {
        try {
            const structure = await this.analyzeRepository(params.files);
            const template = this.getTemplateForType(params.type.type);

            const prompt = `
Generate a GitHub issue based on the following user input and repository analysis.

Issue Type: ${params.type.type}
User Description: ${params.description}

Repository Structure:
${structure}

${template}`;

            const response = await this.openai.openai.chat.completions.create({
                model: 'chatgpt-4o-latest',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 1000
            });

            const body = response.choices[0].message.content || 'Failed to generate content';
            const title = await this.generateTitle(params.type.type, params.description);

            return { title, body };
        } catch (error: any) {
            throw new Error(`Failed to generate preview: ${error.message}`);
        }
    }

    async createIssue(content: GeneratedIssueContent, type: IssueType): Promise<string | undefined> {
        try {
            const config = vscode.workspace.getConfiguration('otakCommitter');
            const useEmoji = config.get<boolean>('useEmoji') || false;

            const issueTitle = useEmoji 
                ? `${type.label.split(' ')[0]} ${content.title}`
                : `[${type.type}] ${content.title}`;

            const issue = await this.github.createIssue({
                title: issueTitle,
                body: content.body
            });

            return issue.html_url;

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to create issue: ${error.message}`);
            return undefined;
        }
    }
}