/**
 * Integration test for Commit Message generation
 *
 * Verifies that the commit message prompt produces correctly
 * structured content when sent to the OpenAI API with gpt-5.4.
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
 * System prompt matching src/languages/english.ts (PromptType.System)
 * without importing vscode-dependent module.
 */
const SYSTEM_PROMPT = `You are an experienced software engineer assisting with project commit messages and PR creation.
Your output has the following characteristics:

- Clear and concise English
- Technically accurate expressions
- Appropriate summarization of changes`;

/**
 * Character limits by style (mirrors MESSAGE_LENGTH_LIMITS in prompt.ts)
 */
const CHAR_LIMITS: Record<string, number> = {
    simple: 600,
    normal: 1200,
    detailed: 2400,
};

/**
 * Build a commit prompt identical to PromptService.createCommitPrompt
 * without vscode.workspace.getConfiguration dependency.
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
${options.useBulletList ? 'Format the body as follows: first write a brief summary of the changes in up to 3 lines of prose, then leave a blank line, then list the specific changes as a bullet list (use "- " prefix for each item). Each bullet point should describe one logical change.' : ''}
DO NOT use any emojis in the content.`;
}

const SAMPLE_DIFF = `diff --git a/src/services/auth.ts b/src/services/auth.ts
--- a/src/services/auth.ts
+++ b/src/services/auth.ts
@@ -10,6 +10,26 @@
 export class AuthService {
+    private tokenCache: Map<string, string> = new Map();
+
+    async validateToken(token: string): Promise<boolean> {
+        if (this.tokenCache.has(token)) {
+            return true;
+        }
+        const isValid = await this.checkTokenWithServer(token);
+        if (isValid) {
+            this.tokenCache.set(token, Date.now().toString());
+        }
+        return isValid;
+    }
+
+    clearCache(): void {
+        this.tokenCache.clear();
+    }
 }`;

suite('Commit Message Integration Tests', () => {
    const apiKey = process.env.OPENAI_API_KEY;
    const isValidApiKey =
        apiKey && apiKey.startsWith('sk-') && apiKey.length > 20 && !apiKey.includes('*');

    test('gpt-5.4 should generate a valid conventional commit message', async function () {
        this.timeout(120000);

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
                model: 'gpt-5.4',
                messages: [
                    { role: 'developer', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                reasoning_effort: 'low',
                max_completion_tokens: 5000,
                response_format: { type: 'text' },
                store: false,
            });

            const message = response.choices[0]?.message?.content?.trim();
            console.log('=== Commit message (english, normal) ===');
            console.log(message);
            console.log('=========================================');

            assert.ok(message, 'Should return a commit message');

            // First line should match conventional commits pattern
            const firstLine = message.split('\n')[0];
            const conventionalPattern = /^(fix|feat|docs|style|refactor|perf|test|chore)(\(.+\))?:\s*.+/;
            assert.ok(
                conventionalPattern.test(firstLine),
                `First line should match Conventional Commits format, got: "${firstLine}"`,
            );

            // Should have a body
            const lines = message.split('\n').filter((l) => l.trim().length > 0);
            assert.ok(lines.length > 1, `Should have body lines, got ${lines.length} total lines`);

            // Body should contain bullet points
            const bodyLines = lines.slice(1);
            const bulletLines = bodyLines.filter((l) => l.trim().startsWith('- '));
            assert.ok(
                bulletLines.length >= 1,
                `Expected at least 1 bullet line, got ${bulletLines.length}`,
            );

            console.log(`✓ Commit message test passed (${lines.length} lines, ${bulletLines.length} bullets)`);
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                console.log('Skipping: Invalid API key (401)');
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('gpt-5.4 should generate a simple style commit message', async function () {
        this.timeout(120000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildCommitPrompt(SAMPLE_DIFF, {
            language: 'english',
            messageStyle: 'simple',
            useBulletList: false,
            useConventionalCommits: true,
        });

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-5.4',
                messages: [
                    { role: 'developer', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                reasoning_effort: 'low',
                max_completion_tokens: 5000,
                response_format: { type: 'text' },
                store: false,
            });

            const message = response.choices[0]?.message?.content?.trim();
            console.log('=== Commit message (english, simple) ===');
            console.log(message);
            console.log('=========================================');

            assert.ok(message, 'Should return a commit message');
            assert.ok(
                message.length <= 600,
                `Simple message should be under 600 chars, got ${message.length}`,
            );

            console.log(`✓ Simple commit message test passed (${message.length} chars)`);
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('gpt-5.4 should generate a Japanese commit message', async function () {
        this.timeout(120000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildCommitPrompt(SAMPLE_DIFF, {
            language: 'japanese',
            messageStyle: 'normal',
            useBulletList: true,
            useConventionalCommits: true,
        });

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-5.4',
                messages: [
                    { role: 'developer', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                reasoning_effort: 'low',
                max_completion_tokens: 5000,
                response_format: { type: 'text' },
                store: false,
            });

            const message = response.choices[0]?.message?.content?.trim();
            console.log('=== Commit message (japanese, normal) ===');
            console.log(message);
            console.log('==========================================');

            assert.ok(message, 'Should return a commit message');

            // Body should contain Japanese characters
            const japanesePattern = /[\u3000-\u9FFF\uF900-\uFAFF]/;
            assert.ok(
                japanesePattern.test(message),
                'Commit message should contain Japanese characters',
            );

            // First line should still have conventional commit prefix
            const firstLine = message.split('\n')[0];
            const conventionalPattern = /^(fix|feat|docs|style|refactor|perf|test|chore)(\(.+\))?:\s*.+/;
            assert.ok(
                conventionalPattern.test(firstLine),
                `First line should match Conventional Commits format, got: "${firstLine}"`,
            );

            console.log('✓ Japanese commit message test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });
});
