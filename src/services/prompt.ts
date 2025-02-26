import * as vscode from 'vscode';
import { PromptType } from '../types/language';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { TemplateInfo } from '../types';
import { COMMIT_PREFIXES, CommitPrefix } from '../constants/commitGuide';

export class PromptService {
    private async loadLanguageModule(language: string): Promise<(type: PromptType) => string> {
        try {
            try {
                const module = await import(`../languages/${language}`);
                const promptFunction = module[`get${language.charAt(0).toUpperCase() + language.slice(1)}Prompt`];
                if (promptFunction) {
                    return promptFunction;
                }
            } catch (importError) {
                console.warn(`Language module not found for ${language}, falling back to English:`, importError);
            }

            // フォールバック：英語
            const { getEnglishPrompt } = await import('../languages/english');
            return getEnglishPrompt;
        } catch (error) {
            console.error('Error loading language module:', error);
            vscode.window.showErrorMessage(`Failed to load language module: ${error}`);
            const { getEnglishPrompt } = await import('../languages/english');
            return getEnglishPrompt;
        }
    }

    async createCommitPrompt(
        diff: string,
        language: string,
        messageStyle: MessageStyle,
        template?: TemplateInfo
    ): Promise<string> {
        // テンプレートがある場合はそれを基に生成
        if (template) {
            return `Based on the following template and Git diff, generate a commit message:

Template:
${template.content}

Git diff:
${diff}

Please follow the template format strictly without any leading newlines.`;
        }

        // テンプレートがない場合はPrefixを使用
        const prefixDescriptions = COMMIT_PREFIXES.map(prefix => {
            const desc = prefix.description[language as keyof CommitPrefix['description']] || prefix.description.english;
            return `${prefix.prefix}: ${desc}`;
        }).join('\n');

        return `Generate a commit message in ${language} for the following Git diff.
Use one of these prefixes:

${prefixDescriptions}

The commit message should follow this format without any leading newlines:
<prefix>: <subject>

<body>

The subject line should be under 50 characters.
The body should be wrapped at 72 characters.
The style should be: ${messageStyle}

Git diff:
${diff}

Please provide a clear and ${messageStyle} commit message following the format above.`;
    }

    async generateDiffSummary(diff: PullRequestDiff): Promise<string> {
        return `Changed files:
${diff.files.map(file => `- ${file.filename} (additions: ${file.additions}, deletions: ${file.deletions})`).join('\n')}

Detailed changes:
${diff.files.map(file => `
[${file.filename}]
${file.patch}`).join('\n')}`;
    }

    async createPRPrompt(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo
    ): Promise<{ title: string; body: string }> {
        const diffSummary = await this.generateDiffSummary(diff);

        const titlePrompt = `Generate a Pull Request title in ${language}.

Requirements:
1. Title should be concise and accurately represent the changes
2. Include a prefix (e.g., "Feature:", "Fix:", "Improvement:", etc.)

Git diff: ${diffSummary}`;

        const bodyPrompt = template
            ? `Based on the following template and Git diff, generate a pull request:

NOTE: Generate the content in ${language}.

Template:
${template.content}

Git diff:
${diffSummary}

Please follow the template format strictly and ensure all content is in ${language}.`
            : `Generate a detailed Pull Request description in ${language} for the following changes.

# Overview
- Brief explanation of implemented features or fixes
- Purpose and background of changes
- Technical approach taken

# Key Review Points
- Areas that need special attention from reviewers
- Important design decisions
- Performance and maintainability considerations

# Change Details
- Main changes implemented
- Affected components and functionality
- Dependency changes (if any)

# Additional Notes
- Deployment considerations
- Impact on existing features
- Required configuration or environment variables

Git diff:
${diffSummary}

Note: Please ensure all content is written in ${language}.`;

        return {
            title: titlePrompt,
            body: bodyPrompt
        };
    }
}