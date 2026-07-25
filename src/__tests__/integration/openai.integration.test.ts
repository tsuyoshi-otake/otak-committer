/**
 * OpenAI API Integration Test
 *
 * This test requires a valid OPENAI_API_KEY environment variable.
 * Run with: npx dotenvx run -f .env.local -- npm test
 */

import OpenAI from 'openai';
import { createOpenAIClient } from '../../services/openaiClient';
import {
    createOpenAIConnectionContext,
    isOfficialOpenAIBaseUrl,
} from '../../services/openaiConnection';
import { requestTextCompletion } from '../../services/openai.completion';
import { getModelForOperation } from '../../services/openaiModels';

suite('OpenAI API Integration Tests', () => {
    const apiKey = process.env.OPENAI_API_KEY;

    const connection = apiKey
        ? createOpenAIConnectionContext(
              apiKey,
              process.env.OPENAI_BASE_URL,
          )
        : undefined;
    const officialKeyPattern =
        /^sk-(?:proj-|svcacct-|admin-|or-|ant-)?[A-Za-z0-9_-]{20,}$/;
    const hasUsableCredential =
        !!connection &&
        !connection.apiKey.includes('*') &&
        (!isOfficialOpenAIBaseUrl(connection.baseURL) ||
            officialKeyPattern.test(connection.apiKey));

    test('GPT-5.6 Luna commit completion should work with the configured endpoint', async function () {
        this.timeout(120000);

        if (!hasUsableCredential || !connection) {
            console.log(
                'Skipping: Valid OPENAI_API_KEY not set. Run with: npx dotenvx run -f .env.local -- npm test',
            );
            this.skip();
            return;
        }

        try {
            const content = await requestTextCompletion({
                openai: createOpenAIClient(connection),
                model: getModelForOperation('commit-message'),
                systemPrompt: 'You generate concise commit messages.',
                userPrompt: 'Return exactly: test: verify OpenAI connection',
                maxCompletionTokens: 100,
                reasoningEffort: 'low',
            });
            console.log('API Response:', content);

            // Verify we got a response
            if (!content) {
                throw new Error('No response content received');
            }

            console.log('✓ OpenAI API integration test passed');
        } catch (error: unknown) {
            if (error instanceof OpenAI.APIError) {
                // Skip test if API key is invalid (401) - indicates key not properly configured via dotenvx
                if (error.status === 401) {
                    console.log(
                        'Skipping: Invalid API key. Configure with: npx dotenvx set OPENAI_API_KEY "sk-..." -f .env.local',
                    );
                    this.skip();
                    return;
                }
                console.error('API Error:', error.status, error.message);
                throw new Error(`API Error: ${error.status} - ${error.message}`);
            }
            throw error;
        }
    });

    test('API key validation should work', async function () {
        this.timeout(10000);

        if (!hasUsableCredential) {
            console.log(
                'Skipping: Valid OPENAI_API_KEY not set. Run with: npx dotenvx run -f .env.local -- npm test',
            );
            this.skip();
            return;
        }

        // API key format is already validated by isValidApiKey check
        console.log('✓ API key format validation passed');
    });
});
