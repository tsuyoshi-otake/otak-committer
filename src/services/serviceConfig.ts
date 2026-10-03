import * as vscode from 'vscode';
import { ConfigManager } from '../infrastructure/config/ConfigManager';
import type { ServiceConfig } from '../types';
import type { ReasoningEffort } from '../types/enums/ReasoningEffort';

/**
 * Build the complete service configuration from the single VS Code settings adapter.
 *
 * `openaiBaseUrl` is the raw setting. It is resolved against OPENAI_BASE_URL and
 * validated only where an OpenAI connection is created, so an invalid endpoint
 * cannot break services that never talk to OpenAI.
 */
export function getServiceConfig(): ServiceConfig {
    const config = new ConfigManager();
    const rawConfig = vscode.workspace.getConfiguration('otakCommitter');
    return {
        openaiApiKey: rawConfig.get<string>('openaiApiKey'),
        openaiBaseUrl: config.get('openaiBaseUrl'),
        githubToken: rawConfig.get<string>('github.token'),
        language: config.get('language') || 'english',
        messageStyle: config.get('messageStyle') || 'normal',
        useEmoji: config.get('useEmoji') || false,
        reasoningEffort: config.get('reasoningEffort') || ('low' as ReasoningEffort),
    };
}
