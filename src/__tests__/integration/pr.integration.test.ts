/**
 * Integration test for PR (Pull Request) generation
 *
 * Verifies that the PR structured output produces correctly
 * structured content when sent to the OpenAI API.
 *
 * Requires: OPENAI_API_KEY environment variable
 * Run with: OPENAI_API_KEY=sk-... npm run test:unit
 *           (or npx dotenvx run -f .env.local -- npm run test:unit)
 */

import * as assert from 'assert';
import OpenAI from 'openai';

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
 * Sample PR diff data mirroring the PullRequestDiff type
 * without importing vscode-dependent types.
 */
const SAMPLE_PR_DIFF = {
    files: [
        {
            filename: 'src/services/auth.ts',
            additions: 25,
            deletions: 5,
            patch: `@@ -10,6 +10,26 @@
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
 }`,
        },
        {
            filename: 'src/services/auth.test.ts',
            additions: 15,
            deletions: 0,
            patch: `@@ -0,0 +1,15 @@
+import { AuthService } from './auth';
+
+describe('AuthService', () => {
+    it('should validate tokens', async () => {
+        const service = new AuthService();
+        const result = await service.validateToken('test-token');
+        expect(result).toBeDefined();
+    });
+
+    it('should clear cache', () => {
+        const service = new AuthService();
+        service.clearCache();
+    });
+});`,
        },
    ],
    stats: { additions: 40, deletions: 5 },
};

/**
 * Mirrors PromptService.generateDiffSummary without vscode dependency.
 */
function generateDiffSummary(
    diff: typeof SAMPLE_PR_DIFF,
): string {
    return `Changed files:
${diff.files.map((f) => `- ${f.filename} (additions: ${f.additions}, deletions: ${f.deletions})`).join('\n')}

Detailed changes:
${diff.files
    .map(
        (f) => `
[${f.filename}]
${f.patch}`,
    )
    .join('\n')}`;
}

/**
 * JSON schema for structured PR output
 */
const PR_CONTENT_SCHEMA = {
    type: 'object',
    properties: {
        title: { type: 'string', description: 'Pull request title with prefix' },
        body: { type: 'string', description: 'Pull request body in markdown' },
    },
    required: ['title', 'body'],
    additionalProperties: false,
} as const;

/**
 * Build a combined PR prompt identical to PromptService.createPRPrompt
 * without vscode.workspace.getConfiguration dependency.
 */
function buildPRPrompt(
    diffSummary: string,
    language: string,
    useEmoji: boolean,
): string {
    const emojiInstruction = useEmoji ? '' : 'DO NOT use any emojis in the content. ';
    return `Generate a Pull Request title and body in ${language} for the following changes.

Title requirements:
1. Concise and accurately represents the changes
2. Include a prefix (e.g., "Feature:", "Fix:", "Improvement:", etc.) ${useEmoji ? 'with appropriate emoji prefix' : 'without emoji'}
3. Just the title text, no labels like "Title:" and no quotes

Body requirements:
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
- Required configuration or environment variables

${emojiInstruction}Git diff:
${diffSummary}`;
}

suite('PR Generation Integration Tests', () => {
    const apiKey = process.env.OPENAI_API_KEY;
    const isValidApiKey =
        apiKey && apiKey.startsWith('sk-') && apiKey.length > 20 && !apiKey.includes('*');

    const diffSummary = generateDiffSummary(SAMPLE_PR_DIFF);

    test('Structured output should return valid PR title and body', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            console.log(
                'Skipping: Valid OPENAI_API_KEY not set. Run with: OPENAI_API_KEY=sk-... npm run test:unit',
            );
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildPRPrompt(diffSummary, 'english', false);

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-5.4',
                messages: [
                    { role: 'developer', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                reasoning_effort: 'low',
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'pr_content',
                        strict: true,
                        schema: PR_CONTENT_SCHEMA,
                    },
                },
            });

            const content = response.choices[0]?.message?.content?.trim();
            assert.ok(content, 'Should return content');

            const result = JSON.parse(content) as { title: string; body: string };

            console.log('=== PR structured output ===');
            console.log('Title:', result.title);
            console.log('Body:', result.body.substring(0, 200) + '...');
            console.log('============================');

            assert.ok(result.title, 'Should return a PR title');
            assert.ok(result.body, 'Should return a PR body');

            // Title should start with a prefix keyword
            const prefixPattern =
                /^(Feature|Fix|Improvement|Refactor|Chore|Docs|feat|fix|chore|docs|test|perf|style|refactor)\b/i;
            const cleanTitle = result.title.replace(/^["']|["']$/g, '');
            assert.ok(
                prefixPattern.test(cleanTitle),
                `PR title should start with a prefix keyword, got: "${result.title}"`,
            );

            // Body should be substantial
            assert.ok(result.body.length > 100, `PR body should be substantial, got ${result.body.length} chars`);

            // Body should contain expected markdown sections
            const expectedSections = ['Overview', 'Key Review Points', 'Change Details', 'Additional Notes'];
            const foundSections = expectedSections.filter((section) =>
                new RegExp(`#.*${section}`, 'i').test(result.body),
            );
            assert.ok(
                foundSections.length >= 2,
                `Expected at least 2 of 4 sections, found ${foundSections.length}: ${foundSections.join(', ')}`,
            );

            console.log('✓ PR structured output integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                console.log('Skipping: Invalid API key (401)');
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('Structured output without emoji should not contain emojis', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildPRPrompt(diffSummary, 'english', false);

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-5.4',
                messages: [
                    { role: 'developer', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                reasoning_effort: 'low',
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'pr_content',
                        strict: true,
                        schema: PR_CONTENT_SCHEMA,
                    },
                },
            });

            const content = response.choices[0]?.message?.content?.trim();
            assert.ok(content, 'Should return content');

            const result = JSON.parse(content) as { title: string; body: string };
            assert.ok(result.body, 'Should return a PR body');

            const emojiPattern =
                /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
            assert.ok(
                !emojiPattern.test(result.body),
                'PR body should not contain emojis when useEmoji=false',
            );

            console.log('✓ PR structured output no-emoji integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('Structured output in Japanese should contain Japanese characters', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildPRPrompt(diffSummary, 'japanese', false);

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-5.4',
                messages: [
                    { role: 'developer', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                reasoning_effort: 'low',
                response_format: {
                    type: 'json_schema',
                    json_schema: {
                        name: 'pr_content',
                        strict: true,
                        schema: PR_CONTENT_SCHEMA,
                    },
                },
            });

            const content = response.choices[0]?.message?.content?.trim();
            assert.ok(content, 'Should return content');

            const result = JSON.parse(content) as { title: string; body: string };

            console.log('=== Japanese PR structured output ===');
            console.log('Title:', result.title);
            console.log('Body:', result.body.substring(0, 200) + '...');
            console.log('=====================================');

            assert.ok(result.title, 'Should return a Japanese PR title');
            assert.ok(result.body, 'Should return a Japanese PR body');
            assert.ok(result.body.length > 50, 'Japanese PR body should be substantial');

            const japanesePattern = /[\u3000-\u9FFF\uF900-\uFAFF]/;
            assert.ok(
                japanesePattern.test(result.body),
                'PR body should contain Japanese characters',
            );

            console.log('✓ Japanese PR structured output integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });
});
