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
`,
                'issue.task': `
Please provide output in the following format:

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
- [References and links]
`,
                'issue.standard': `
Please provide output in the following format:

### Description
[Detailed explanation based on user description and code analysis]

### Steps to Reproduce (for bugs) or Implementation Details (for features)
1. [Step 1]
2. [Step 2]
...

### Expected Behavior
[Expected behavior or outcome]

### Current Behavior (for bugs)
[Current behavior or issue]

### Technical Details
- Affected Files: [List relevant files from the analysis]
- Related Components: [Identify components based on code]
- Proposed Changes: [Suggest changes based on analysis]

### Additional Context
- Environment Information
- Related Settings
- Other Important Information

### Checklist
- [ ] Documentation update required
- [ ] Tests addition/update required
- [ ] Breaking changes included
`
        };

        return prompts[type] || '';
};