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

Requirements:
1. Description should include:
   - Overview of changes
   - Purpose of changes
   - Scope of impact
   - Testing instructions (if needed)
2. Write in English
3. Use bullet points for better readability

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};