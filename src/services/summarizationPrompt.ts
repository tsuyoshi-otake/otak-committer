export function createSummarizationPromptContent(chunkDiff: string, language: string): string {
    return `Summarize the following code changes concisely in ${language}. Focus on:
- What was changed (files, functions, components)
- Why it was likely changed (bug fix, feature, refactor)
- Key technical details

Changes:
${chunkDiff}

Provide a concise technical summary.`;
}
