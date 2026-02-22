/**
 * Integration test for PR (Pull Request) generation
 *
 * Verifies that the PR title and body prompts produce correctly
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
 * Build a PR title prompt identical to PromptService.createPRPrompt title
 * without vscode.workspace.getConfiguration dependency.
 */
function buildPRTitlePrompt(
    diffSummary: string,
    language: string,
    useEmoji: boolean,
): string {
    return `Generate a Pull Request title in ${language}.

Requirements:
1. Title should be concise and accurately represent the changes
2. Include a prefix (e.g., "Feature:", "Fix:", "Improvement:", etc.) ${useEmoji ? 'with appropriate emoji prefix' : 'without emoji'}
3. Output ONLY the title text itself. Do not include labels like "Title:" or wrap in quotes.

Git diff: ${diffSummary}`;
}

/**
 * Build a PR body prompt identical to PromptService.createPRPrompt body
 * without vscode.workspace.getConfiguration dependency.
 */
function buildPRBodyPrompt(
    diffSummary: string,
    language: string,
    useEmoji: boolean,
): string {
    const emojiInstruction = useEmoji ? '' : 'DO NOT use any emojis in the content. ';
    return `Generate a detailed Pull Request description in ${language} for the following changes.

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

Git diff:
${diffSummary}

Note: Please ensure all content is written in ${language}. ${emojiInstruction}`;
}

suite('PR Generation Integration Tests', () => {
    const apiKey = process.env.OPENAI_API_KEY;
    const isValidApiKey =
        apiKey && apiKey.startsWith('sk-') && apiKey.length > 20 && !apiKey.includes('*');

    const diffSummary = generateDiffSummary(SAMPLE_PR_DIFF);

    test('PR title should contain a prefix keyword', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            console.log(
                'Skipping: Valid OPENAI_API_KEY not set. Run with: OPENAI_API_KEY=sk-... npm run test:unit',
            );
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildPRTitlePrompt(diffSummary, 'english', false);

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 100,
                temperature: 0,
            });

            const title = response.choices[0]?.message?.content?.trim();
            console.log('=== PR title response ===');
            console.log(title);
            console.log('=========================');

            assert.ok(title, 'Should return a PR title');

            // Title should start with a prefix keyword (no "Title:" label)
            const prefixPattern =
                /^(Feature|Fix|Improvement|Refactor|Chore|Docs|feat|fix|chore|docs|test|perf|style|refactor)\b/i;
            const cleanTitle = title.replace(/^["']|["']$/g, '');
            assert.ok(
                prefixPattern.test(cleanTitle),
                `PR title should start with a prefix keyword, got: "${title}"`,
            );

            // Verify no "Title:" label was included
            assert.ok(
                !title.startsWith('Title:') && !title.startsWith('タイトル:'),
                `PR title should not include a "Title:" label, got: "${title}"`,
            );

            console.log('✓ PR title prefix integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                console.log('Skipping: Invalid API key (401)');
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('PR body should contain expected markdown sections', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildPRBodyPrompt(diffSummary, 'english', false);

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 2000,
                temperature: 0,
            });

            const body = response.choices[0]?.message?.content?.trim();
            console.log('=== PR body response ===');
            console.log(body);
            console.log('========================');

            assert.ok(body, 'Should return a PR body');
            assert.ok(body.length > 100, `PR body should be substantial, got ${body.length} chars`);

            const expectedSections = ['Overview', 'Key Review Points', 'Change Details', 'Additional Notes'];
            const foundSections = expectedSections.filter((section) =>
                new RegExp(`#.*${section}`, 'i').test(body),
            );
            console.log(`Found sections: ${foundSections.join(', ')}`);

            assert.ok(
                foundSections.length >= 2,
                `Expected at least 2 of 4 sections, found ${foundSections.length}: ${foundSections.join(', ')}`,
            );

            console.log('✓ PR body sections integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('PR body without emoji should not contain emojis', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildPRBodyPrompt(diffSummary, 'english', false);

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 2000,
                temperature: 0,
            });

            const body = response.choices[0]?.message?.content?.trim();
            assert.ok(body, 'Should return a PR body');

            const emojiPattern =
                /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
            assert.ok(
                !emojiPattern.test(body),
                'PR body should not contain emojis when useEmoji=false',
            );

            console.log('✓ PR body no-emoji integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('PR title and body in Japanese should contain Japanese characters', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const titlePrompt = buildPRTitlePrompt(diffSummary, 'japanese', false);
        const bodyPrompt = buildPRBodyPrompt(diffSummary, 'japanese', false);

        try {
            const [titleResponse, bodyResponse] = await Promise.all([
                openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: titlePrompt },
                    ],
                    max_tokens: 100,
                    temperature: 0,
                }),
                openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: bodyPrompt },
                    ],
                    max_tokens: 2000,
                    temperature: 0,
                }),
            ]);

            const title = titleResponse.choices[0]?.message?.content?.trim();
            const body = bodyResponse.choices[0]?.message?.content?.trim();

            console.log('=== Japanese PR title ===');
            console.log(title);
            console.log('=== Japanese PR body ===');
            console.log(body?.substring(0, 200) + '...');
            console.log('========================');

            assert.ok(title, 'Should return a Japanese PR title');
            assert.ok(body, 'Should return a Japanese PR body');
            assert.ok(body.length > 50, 'Japanese PR body should be substantial');

            const japanesePattern = /[\u3000-\u9FFF\uF900-\uFAFF]/;
            assert.ok(
                japanesePattern.test(body),
                'PR body should contain Japanese characters',
            );

            console.log('✓ Japanese PR generation integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('PR title and body generated in parallel should both succeed', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const titlePrompt = buildPRTitlePrompt(diffSummary, 'english', false);
        const bodyPrompt = buildPRBodyPrompt(diffSummary, 'english', false);

        try {
            const [titleResponse, bodyResponse] = await Promise.all([
                openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: titlePrompt },
                    ],
                    max_tokens: 100,
                    temperature: 0,
                }),
                openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: bodyPrompt },
                    ],
                    max_tokens: 2000,
                    temperature: 0,
                }),
            ]);

            const title = titleResponse.choices[0]?.message?.content?.trim();
            const body = bodyResponse.choices[0]?.message?.content?.trim();

            assert.ok(
                typeof title === 'string' && title.length > 0,
                'Parallel PR title should be a non-empty string',
            );
            assert.ok(
                typeof body === 'string' && body.length > 0,
                'Parallel PR body should be a non-empty string',
            );

            console.log(`✓ Parallel PR generation: title=${title.length} chars, body=${body.length} chars`);
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });
});
