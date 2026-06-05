import { PullRequestDiff } from '../types/interfaces/GitHub';
import { TemplateInfo } from '../types';
import { PromptGenerationOptions, sanitizeTemplateContent } from './promptConfig';

export function generateDiffSummaryContent(diff: PullRequestDiff): string {
    return `Changed files:
${diff.files.map((file) => `- ${file.filename} (additions: ${file.additions}, deletions: ${file.deletions})`).join('\n')}

Detailed changes:
${diff.files
    .map(
        (file) => `
[${file.filename}]
${file.patch}`,
    )
    .join('\n')}`;
}

export function createPRPromptContent(
    diffSummary: string,
    language: string,
    template: TemplateInfo | undefined,
    options: PromptGenerationOptions,
): string {
    const emojiInstruction = options.useEmoji ? '' : 'DO NOT use any emojis in the content. ';
    const customInstruction = options.customMessage
        ? `Additional requirements: ${options.customMessage}\n\n`
        : '';

    const titleInstruction = `Title requirements:
1. Concise and accurately represents the changes
2. Include a prefix (e.g., "Feature:", "Fix:", "Improvement:", etc.) ${options.useEmoji ? 'with appropriate emoji prefix' : 'without emoji'}
3. Just the title text, no labels like "Title:" and no quotes`;

    const bodyInstruction = template
        ? `Body requirements:
Follow the template format strictly.

Template:
${sanitizeTemplateContent(template.content)}`
        : `Body requirements:
Generate a detailed description with the following sections:

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
- Required configuration or environment variables`;

    return `Generate a Pull Request title and body in ${language} for the following changes.

${titleInstruction}

${bodyInstruction}

${emojiInstruction}${customInstruction}Git diff:
${diffSummary}`;
}
