import { PromptType } from '../types/language';

export const getEnglishPrompt = (type: PromptType): string => {
    const prompts: Record<PromptType, string> = {
        system: `
You are an experienced software engineer assisting with project commit messages and PR creation.
Your output has the following characteristics:

- Clear and concise English
- Technically accurate expressions
- Appropriate summarization of changes
`,
        commit: `
Based on the provided diff, generate a {{style}} style commit message.

Style description:
- normal: Standard technical writing
- emoji: Friendly tone with emojis
- kawaii: Cute and friendly tone

Diff:
{{diff}}
`,
        prTitle: `
Based on the following diff, generate a Pull Request title.

Requirements:
1. Title should be concise and accurately represent the changes
2. Include a prefix (e.g., "Feature:", "Fix:", "Improvement:", etc.)
3. Write in English

Diff:
{{diff}}
`,
        prBody: `
Based on the following diff, generate a detailed Pull Request description.

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

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};