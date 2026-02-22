/**
 * Integration test for useBulletList feature
 *
 * Verifies that the bullet list instruction in the prompt
 * produces commit messages with "- " prefixed lines in the body.
 *
 * Requires: OPENAI_API_KEY environment variable
 * Run with: OPENAI_API_KEY=sk-... npm run test:unit
 *           (or npx dotenvx run -f .env.local -- npm run test:unit)
 */

import * as assert from 'assert';
import OpenAI from 'openai';
import { COMMIT_PREFIXES, CommitPrefix } from '../../constants/commitGuide';
import {
    extractFilePathsFromDiff,
    generateScopeHint,
    getConventionalCommitsFormat,
} from '../../utils/conventionalCommits';

/**
 * Character limits by style (mirrors MESSAGE_LENGTH_LIMITS in prompt.ts
 * without importing vscode-dependent module)
 */
const CHAR_LIMITS: Record<string, number> = {
    simple: 600,
    normal: 1200,
    detailed: 2400,
};

/**
 * Build a commit prompt identical to PromptService.createCommitPrompt
 * but without vscode.workspace.getConfiguration dependency.
 */
function buildCommitPrompt(
    diff: string,
    options: {
        language: string;
        messageStyle: string;
        useBulletList: boolean;
        useConventionalCommits: boolean;
    },
): string {
    const prefixDescriptions = COMMIT_PREFIXES.map((prefix) => {
        const desc =
            prefix.description[options.language as keyof CommitPrefix['description']] ||
            prefix.description.english;
        return `${prefix.prefix}: ${desc}`;
    }).join('\n');

    const charLimit = CHAR_LIMITS[options.messageStyle] || CHAR_LIMITS.normal;
    const filePaths = extractFilePathsFromDiff(diff);
    const scopeHint = generateScopeHint(filePaths);
    const formatInstruction = getConventionalCommitsFormat(scopeHint);

    return `Generate a commit message in ${options.language} for the following Git diff.
Use one of these prefixes:

${prefixDescriptions}

The commit message should follow this format without any leading newlines:
${formatInstruction}

<body>

The total commit message should be under ${charLimit} characters.
The style should be: ${options.messageStyle}

Git diff:
${diff}

Please provide a clear and ${options.messageStyle} commit message following the format above.
${options.useBulletList ? 'Format the body as a bullet list (use "- " prefix for each item). Each bullet point should describe one logical change.' : ''}
DO NOT use any emojis in the content.`;
}

const SAMPLE_DIFF = `diff --git a/src/services/prompt.ts b/src/services/prompt.ts
--- a/src/services/prompt.ts
+++ b/src/services/prompt.ts
@@ -17,9 +17,9 @@
 export const MESSAGE_LENGTH_LIMITS = {
-    [MessageStyle.Simple]: 200,
-    ['normal']: 400,
-    [MessageStyle.Detailed]: 800,
+    [MessageStyle.Simple]: 600,
+    ['normal']: 1200,
+    [MessageStyle.Detailed]: 2400,
 } as const;
diff --git a/src/types/messageStyle.ts b/src/types/messageStyle.ts
--- a/src/types/messageStyle.ts
+++ b/src/types/messageStyle.ts
@@ -18,7 +18,7 @@
     simple: {
         tokens: {
-            commit: 100,
-            pr: 400,
+            commit: 300,
+            pr: 1200,
         },
     normal: {
         tokens: {
-            commit: 200,
-            pr: 800,
+            commit: 600,
+            pr: 2400,
         },`;

const SYSTEM_PROMPT = `You are an experienced software engineer assisting with project commit messages and PR creation.
Your output has the following characteristics:

- Clear and concise English
- Technically accurate expressions
- Appropriate summarization of changes`;

suite('Bullet List Integration Tests', () => {
    const apiKey = process.env.OPENAI_API_KEY;
    const isValidApiKey =
        apiKey && apiKey.startsWith('sk-') && apiKey.length > 20 && !apiKey.includes('*');

    test('useBulletList=true should produce bullet list body', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            console.log(
                'Skipping: Valid OPENAI_API_KEY not set. Run with: OPENAI_API_KEY=sk-... npm run test:unit',
            );
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildCommitPrompt(SAMPLE_DIFF, {
            language: 'english',
            messageStyle: 'normal',
            useBulletList: true,
            useConventionalCommits: true,
        });

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 1000,
                temperature: 0,
            });

            const message = response.choices[0]?.message?.content?.trim();
            console.log('=== useBulletList=true response ===');
            console.log(message);
            console.log('===================================');

            assert.ok(message, 'Should return a commit message');

            // The body (lines after the first line) should contain bullet points
            const lines = message.split('\n').filter((l) => l.trim().length > 0);
            const bodyLines = lines.slice(1); // skip subject line

            const bulletLines = bodyLines.filter((l) => l.trim().startsWith('- '));
            console.log(
                `Body lines: ${bodyLines.length}, Bullet lines: ${bulletLines.length}`,
            );

            assert.ok(
                bulletLines.length >= 1,
                `Expected at least 1 bullet line in body, got ${bulletLines.length}. Body:\n${bodyLines.join('\n')}`,
            );

            console.log('✓ useBulletList=true integration test passed');
        } catch (error: unknown) {
            if (
                error instanceof OpenAI.APIError &&
                error.status === 401
            ) {
                console.log('Skipping: Invalid API key (401)');
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('useBulletList=false should NOT require bullet list body', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildCommitPrompt(SAMPLE_DIFF, {
            language: 'english',
            messageStyle: 'normal',
            useBulletList: false,
            useConventionalCommits: true,
        });

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 1000,
                temperature: 0,
            });

            const message = response.choices[0]?.message?.content?.trim();
            console.log('=== useBulletList=false response ===');
            console.log(message);
            console.log('====================================');

            assert.ok(message, 'Should return a commit message');

            // Verify the prompt does NOT contain bullet list instruction
            assert.ok(
                !prompt.includes('bullet list'),
                'Prompt should not contain bullet list instruction when disabled',
            );

            console.log('✓ useBulletList=false integration test passed');
        } catch (error: unknown) {
            if (
                error instanceof OpenAI.APIError &&
                error.status === 401
            ) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('Conventional Commits format should be used when enabled', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildCommitPrompt(SAMPLE_DIFF, {
            language: 'english',
            messageStyle: 'normal',
            useBulletList: true,
            useConventionalCommits: true,
        });

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 1000,
                temperature: 0,
            });

            const message = response.choices[0]?.message?.content?.trim();
            assert.ok(message, 'Should return a commit message');

            // First line should match conventional commits pattern: type(scope): subject or type: subject
            const firstLine = message.split('\n')[0];
            const conventionalPattern = /^(fix|feat|docs|style|refactor|perf|test|chore)(\(.+\))?:\s*.+/;
            assert.ok(
                conventionalPattern.test(firstLine),
                `First line should match Conventional Commits format, got: "${firstLine}"`,
            );

            console.log('✓ Conventional Commits format integration test passed');
        } catch (error: unknown) {
            if (
                error instanceof OpenAI.APIError &&
                error.status === 401
            ) {
                this.skip();
                return;
            }
            throw error;
        }
    });
});
