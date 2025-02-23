import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitService } from '../services/git';
import { OpenAIService } from '../services/openai';
import { GitHubService } from '../services/github';
import { getCurrentLanguageConfig } from '../languages';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting all tests.');

    test('getCurrentLanguageConfig returns default language', () => {
        const config = getCurrentLanguageConfig();
        assert.strictEqual(config.name, 'English');
    });

    test('Git service initialization', async () => {
        const git = await GitService.initialize();
        assert.ok(git instanceof GitService);
    });

    test('OpenAI service initialization fails without API key', async () => {
        // 設定をクリア
        await vscode.workspace.getConfiguration('otakCommitter').update('openaiApiKey', '', vscode.ConfigurationTarget.Global);
        
        const openai = await OpenAIService.initialize();
        assert.strictEqual(openai, undefined);
    });

    test('GitHub service initialization fails without token', async () => {
        // 設定をクリア
        await vscode.workspace.getConfiguration('otakCommitter.github').update('token', '', vscode.ConfigurationTarget.Global);
        
        const github = await GitHubService.initializeGitHubClient();
        assert.strictEqual(github, undefined);
    });

    test('Package.json contains all required scripts', () => {
        const packageJson = require('../../package.json');
        assert.ok(packageJson.scripts['vscode:prepublish']);
        assert.ok(packageJson.scripts.compile);
        assert.ok(packageJson.scripts.watch);
        assert.ok(packageJson.scripts.lint);
        assert.ok(packageJson.scripts.test);
    });

    test('Package.json contains all required configurations', () => {
        const packageJson = require('../../package.json');
        const config = packageJson.contributes.configuration.properties;
        
        assert.ok(config['otakCommitter.openaiApiKey']);
        assert.ok(config['otakCommitter.language']);
        assert.ok(config['otakCommitter.messageStyle']);
        assert.ok(config['otakCommitter.customMessage']);
        assert.ok(config['otakCommitter.github.token']);
        assert.ok(config['otakCommitter.github.owner']);
        assert.ok(config['otakCommitter.github.repo']);
    });

    test('Package.json contains all required commands', () => {
        const packageJson = require('../../package.json');
        const commands = packageJson.contributes.commands.map((c: any) => c.command);
        
        assert.ok(commands.includes('otak-committer.generateMessage'));
        assert.ok(commands.includes('otak-committer.generatePR'));
        assert.ok(commands.includes('otak-committer.openSettings'));
        assert.ok(commands.includes('otak-committer.changeLanguage'));
        assert.ok(commands.includes('otak-committer.changeMessageStyle'));
    });
});
