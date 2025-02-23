import { MessageStyle } from '../types/messageStyle';
import { PromptType } from '../types/language';

export const getMiddleEasternPrompt = (type: PromptType): string => {
    const prompts = {
        system: `
You are an experienced software engineer assisting with project commit messages and PR creation.
Your output has the following characteristics:

- Clear RTL language writing
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
        pr: `
Based on the following diff, generate a Pull Request title and description.

Please consider:
1. Title should be concise and accurately represent the changes
2. Description should include:
   - Overview of changes
   - Purpose of changes
   - Scope of impact
   - Testing instructions (if needed)
3. Write with proper RTL support

Diff:
{{diff}}
`
    };

    return prompts[type] || '';
};