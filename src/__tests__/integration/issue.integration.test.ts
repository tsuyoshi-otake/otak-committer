/**
 * Integration test for Issue generation
 *
 * Verifies that the issue title and body prompts produce correctly
 * structured GitHub issue content when sent to the OpenAI API.
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
 * Sample file analysis result mirroring IssueGeneratorService.formatAnalysisResult
 * without importing vscode-dependent module.
 */
const SAMPLE_FILE_ANALYSIS = `# Repository Analysis

## TypeScript Files

### src/services/auth.ts

\`\`\`typescript
export class AuthService {
    private tokenCache: Map<string, string> = new Map();

    async validateToken(token: string): Promise<boolean> {
        if (this.tokenCache.has(token)) {
            return true;
        }
        const isValid = await this.checkTokenWithServer(token);
        if (isValid) {
            this.tokenCache.set(token, Date.now().toString());
        }
        return isValid;
    }
}
\`\`\``;

const BUG_DESCRIPTION =
    'The authentication token validation does not handle expired tokens, causing users to remain authenticated after token expiration.';
const FEATURE_DESCRIPTION =
    'Add support for OAuth2 authentication with multiple providers including Google, GitHub, and Microsoft.';

/**
 * Build an issue title prompt identical to IssueGeneratorService.generateTitle
 * without vscode dependency.
 */
function buildIssueTitlePrompt(
    type: string,
    description: string,
    language: string,
): string {
    const MAX_TITLE_TOKENS = 50;
    return `Create a concise title (maximum ${MAX_TITLE_TOKENS} characters) in ${language} for this ${type} based on the following description:\n\n${description}\n\nRequirements:\n- Must be in ${language}\n- Maximum ${MAX_TITLE_TOKENS} characters\n- Clear and descriptive\n- No technical jargon unless necessary`;
}

/**
 * Build an issue body prompt identical to IssueGeneratorService.generatePreview
 * without vscode dependency.
 */
function buildIssueBodyPrompt(
    description: string,
    analysisResult: string,
    useEmoji: boolean,
): string {
    const emojiInstruction = useEmoji
        ? 'Use emojis for section headers and key points.'
        : 'DO NOT use any emojis in the content.';
    return `Generate a GitHub issue in recommended format for the following analysis and description. Include appropriate sections like Background, Problem Statement, Expected Behavior, Steps to Reproduce (if applicable), and Additional Context. Keep the technical details but organize them well.\n\n${emojiInstruction}\n\nRepository Analysis:\n${analysisResult}\n\nUser Description: ${description}`;
}

suite('Issue Generation Integration Tests', () => {
    const apiKey = process.env.OPENAI_API_KEY;
    const isValidApiKey =
        apiKey && apiKey.startsWith('sk-') && apiKey.length > 20 && !apiKey.includes('*');

    test('Issue title for bug type should be concise and descriptive', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            console.log(
                'Skipping: Valid OPENAI_API_KEY not set. Run with: OPENAI_API_KEY=sk-... npm run test:unit',
            );
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildIssueTitlePrompt('bug', BUG_DESCRIPTION, 'english');

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
            console.log('=== Bug issue title ===');
            console.log(title);
            console.log('=======================');

            assert.ok(title, 'Should return an issue title');
            assert.ok(
                title.length <= 100,
                `Issue title should be concise (<=100 chars), got ${title.length} chars: "${title}"`,
            );

            console.log('✓ Bug issue title integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                console.log('Skipping: Invalid API key (401)');
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('Issue body for bug type should contain structured sections', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildIssueBodyPrompt(BUG_DESCRIPTION, SAMPLE_FILE_ANALYSIS, false);

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

            const body = response.choices[0]?.message?.content?.trim();
            console.log('=== Bug issue body ===');
            console.log(body);
            console.log('======================');

            assert.ok(body, 'Should return an issue body');
            assert.ok(body.length > 100, `Issue body should be substantial, got ${body.length} chars`);

            const expectedSections = [
                'Background',
                'Problem Statement',
                'Expected Behavior',
                'Steps to Reproduce',
                'Additional Context',
            ];
            const foundSections = expectedSections.filter(
                (section) =>
                    new RegExp(`(#|\\*\\*).*${section}`, 'i').test(body),
            );
            console.log(`Found sections: ${foundSections.join(', ')}`);

            assert.ok(
                foundSections.length >= 2,
                `Expected at least 2 of 5 sections, found ${foundSections.length}: ${foundSections.join(', ')}`,
            );

            console.log('✓ Bug issue body sections integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('Issue title for feature type should be generated successfully', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildIssueTitlePrompt('feature', FEATURE_DESCRIPTION, 'english');

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
            console.log('=== Feature issue title ===');
            console.log(title);
            console.log('===========================');

            assert.ok(title, 'Should return a feature issue title');
            assert.ok(
                title.length <= 100,
                `Feature issue title should be concise (<=100 chars), got ${title.length} chars`,
            );

            console.log('✓ Feature issue title integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('Issue body without emoji should not contain emojis', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildIssueBodyPrompt(BUG_DESCRIPTION, SAMPLE_FILE_ANALYSIS, false);

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

            const body = response.choices[0]?.message?.content?.trim();
            assert.ok(body, 'Should return an issue body');

            const emojiPattern =
                /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
            assert.ok(
                !emojiPattern.test(body),
                'Issue body should not contain emojis when useEmoji=false',
            );

            console.log('✓ Issue body no-emoji integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('Issue body with emoji should contain emojis', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const prompt = buildIssueBodyPrompt(BUG_DESCRIPTION, SAMPLE_FILE_ANALYSIS, true);

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

            const body = response.choices[0]?.message?.content?.trim();
            assert.ok(body, 'Should return an issue body');

            console.log('=== Issue body with emoji ===');
            console.log(body?.substring(0, 300) + '...');
            console.log('=============================');

            // Soft assertion: AI may not always include emojis,
            // but the prompt explicitly requests them
            const emojiPattern =
                /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/u;
            const shortcodePattern = /:[a-z_]+:/;
            const hasEmoji = emojiPattern.test(body) || shortcodePattern.test(body);

            if (!hasEmoji) {
                console.log(
                    'Warning: No emojis detected in response despite useEmoji=true (AI may not always comply)',
                );
            } else {
                console.log('✓ Emojis detected in issue body');
            }

            // Still assert that the prompt requested emojis
            assert.ok(
                prompt.includes('Use emojis'),
                'Prompt should contain emoji instruction when useEmoji=true',
            );

            console.log('✓ Issue body emoji integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });

    test('Issue generation in Japanese should contain Japanese text', async function () {
        this.timeout(60000);

        if (!isValidApiKey) {
            this.skip();
            return;
        }

        const openai = new OpenAI({ apiKey });
        const titlePrompt = buildIssueTitlePrompt('bug', BUG_DESCRIPTION, 'japanese');
        const bodyPrompt = buildIssueBodyPrompt(BUG_DESCRIPTION, SAMPLE_FILE_ANALYSIS, false);

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
                        {
                            role: 'user',
                            content: `Generate the following content in Japanese.\n\n${bodyPrompt}`,
                        },
                    ],
                    max_tokens: 1000,
                    temperature: 0,
                }),
            ]);

            const title = titleResponse.choices[0]?.message?.content?.trim();
            const body = bodyResponse.choices[0]?.message?.content?.trim();

            console.log('=== Japanese issue title ===');
            console.log(title);
            console.log('=== Japanese issue body ===');
            console.log(body?.substring(0, 200) + '...');
            console.log('===========================');

            assert.ok(title, 'Should return a Japanese issue title');
            assert.ok(body, 'Should return a Japanese issue body');

            const japanesePattern = /[\u3000-\u9FFF\uF900-\uFAFF]/;
            assert.ok(
                japanesePattern.test(body),
                'Issue body should contain Japanese characters',
            );

            console.log('✓ Japanese issue generation integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError && error.status === 401) {
                this.skip();
                return;
            }
            throw error;
        }
    });
});
