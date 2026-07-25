import * as vscode from 'vscode';
import { ConfigManager } from '../infrastructure/config/ConfigManager';
import type { ServiceConfig } from '../types';
import type { ReasoningEffort } from '../types/enums/ReasoningEffort';
import { resolveOpenAIBaseUrl } from './openaiConnection';

/**
 * Build the complete service configuration from the single VS Code settings
 * adapter plus environment-backed OpenAI endpoint compatibility.
 */
export function getServiceConfig(): ServiceConfig {
    const config = new ConfigManager();
    const rawConfig = vscode.workspace.getConfiguration('otakCommitter');
    return {
        openaiApiKey: rawConfig.get<string>('openaiApiKey'),
        openaiBaseUrl: resolveOpenAIBaseUrl(
            config.get('openaiBaseUrl'),
            process.env.OPENAI_BASE_URL,
        ),
        githubToken: rawConfig.get<string>('github.token'),
        language: config.get('language') || 'english',
        messageStyle: config.get('messageStyle') || 'normal',
        useEmoji: config.get('useEmoji') || false,
        reasoningEffort: config.get('reasoningEffort') || ('low' as ReasoningEffort),
    };
}
