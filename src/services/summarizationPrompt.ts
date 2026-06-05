/**
 * Build the prompt used to ask the AI model to summarize a chunked diff
 *
 * @param chunkDiff - The diff chunk to be summarized
 * @param language - Natural language to write the summary in
 * @returns The composed prompt string to send to the AI model
 */
export function createSummarizationPromptContent(chunkDiff: string, language: string): string {
    return `Summarize the following code changes concisely in ${language}. Focus on:
- What was changed (files, functions, components)
- Why it was likely changed (bug fix, feature, refactor)
- Key technical details

Changes:
${chunkDiff}

Provide a concise technical summary.`;
}
