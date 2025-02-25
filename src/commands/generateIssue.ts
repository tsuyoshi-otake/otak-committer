import * as vscode from 'vscode';
import { OpenAIService } from '../services/openai';
import { GitService } from '../services/git';
import { GitHubService } from '../services/github';

export async function generateIssue() {
    try {
        const gitService = await GitService.initialize();
        if (!gitService) {
            throw new Error('Failed to initialize Git service');
        }

        // Load configuration
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const useEmoji = config.get<boolean>('useEmoji') || false;

        // Get issue information from user input
        const issueType = await vscode.window.showQuickPick([
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
        ], {
            placeHolder: 'Select issue type'
        });

        if (!issueType) {
            return;
        }

        const description = await vscode.window.showInputBox({
            placeHolder: 'Enter issue description',
            prompt: 'Describe the issue, problem, or task'
        });

        if (!description) {
            return;
        }

        // Show progress notification
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Generating issue...",
            cancellable: false
        }, async (progress) => {
            progress.report({ message: "Analyzing repository..." });

            // Get repository state
            const files = await gitService.getTrackedFiles();
            
            progress.report({ message: "Generating issue content..." });
            const repoSummary = await summarizeRepository(files, issueType.type, description);

            // Initialize OpenAI service
            const openai = await OpenAIService.initialize();
            if (!openai) {
                throw new Error('Failed to initialize OpenAI service');
            }

            // Initialize GitHub service
            const github = await GitHubService.initializeGitHubClient();
            if (!github) {
                return;
            }

            progress.report({ message: "Creating issue..." });

            // Generate title from description
            const titleResponse = await openai.openai.chat.completions.create({
                model: 'chatgpt-4o-latest',
                messages: [{
                    role: 'user',
                    content: `Create a concise English title (maximum 50 characters) for this ${issueType.type} based on the following description:\n\n${description}\n\nRequirements:\n- Must be in English\n- Maximum 50 characters\n- Clear and descriptive\n- No technical jargon unless necessary`
                }],
                temperature: 0.1,
                max_tokens: 50
            });

            const generatedTitle = titleResponse.choices[0].message.content?.trim() || description.slice(0, 50);
            const issueTitle = useEmoji 
                ? `${issueType.label.split(' ')[0]} ${generatedTitle}`
                : `[${issueType.type}] ${generatedTitle}`;

            // Create issue
            const issue = await github.createIssue({
                title: issueTitle,
                body: repoSummary
            });

            if (issue) {
                const response = await vscode.window.showInformationMessage(
                    'Issue created successfully',
                    { modal: false },
                    { title: 'Open Issue', isCloseAffordance: false }
                );

                if (response?.title === 'Open Issue') {
                    vscode.env.openExternal(vscode.Uri.parse(issue.html_url));
                }
            }
        });

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to create issue: ${error.message}`);
        console.error(error);
    }
}

async function summarizeRepository(files: string[], issueType: string, userDescription: string): Promise<string> {
    try {
        const openai = await OpenAIService.initialize();
        if (!openai) {
            throw new Error('Failed to initialize OpenAI service');
        }

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
                        // Top level files
                        if (!directoryStructure[topDir]) {
                            directoryStructure[topDir] = [];
                        }
                        directoryStructure[topDir].push(parts[1]);
                    } else if (parts.length > 2) {
                        // Subdirectories
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

        // Convert directory structure to string
        const structureText = Object.entries(directoryStructure)
            .map(([dir, files]) => `${dir}/\n${files.map(f => `  - ${f}`).join('\n')}`)
            .join('\n\n');

        // Select template
        const template = issueType === 'task' ? getTaskTemplate() : getStandardTemplate();

        // Update prompt
        const prompt = `
Generate a GitHub issue based on the following user input and repository analysis.

Issue Type: ${issueType}
User Description: ${userDescription}

Repository Structure:
${structureText}

${template}`;

        const response = await openai.openai.chat.completions.create({
            model: 'chatgpt-4o-latest',
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 1000
        });

        const summary = response.choices[0].message.content;
        return summary || 'Failed to generate analysis';

    } catch (error: any) {
        throw new Error(`Failed to analyze repository: ${error.message}`);
    }
}

function getTaskTemplate(): string {
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

function getStandardTemplate(): string {
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