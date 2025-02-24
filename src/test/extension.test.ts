import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitService } from '../services/git';
import { OpenAIService } from '../services/openai';
import { LANGUAGE_CONFIGS } from '../languages';

suite('Extension Test Suite', () => {
    test('Configuration loads correctly', () => {
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const language = config.get<string>('language') || 'japanese';
        const languageConfig = LANGUAGE_CONFIGS[language];
        
        assert.ok(languageConfig, 'Language configuration should exist');
        assert.strictEqual(typeof languageConfig.name, 'string', 'Language name should be string');
    });

    test('Git service initializes', async () => {
        const git = await GitService.initialize();
        assert.ok(git, 'Git service should initialize');
    });

    test('OpenAI service requires API key', async () => {
        const config = vscode.workspace.getConfiguration('otakCommitter.openai');
        const apiKey = config.get<string>('apiKey');
        
        if (!apiKey) {
            const openai = await OpenAIService.initialize();
            assert.strictEqual(openai, undefined, 'OpenAI service should not initialize without API key');
        }
    });
});
