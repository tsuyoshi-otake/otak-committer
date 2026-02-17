import * as vscode from 'vscode';
import { ServiceConfig } from '../types';
import { ReasoningEffort } from '../types/enums/ReasoningEffort';

// Configuration Management
export function getServiceConfig(): ServiceConfig {
    const config = vscode.workspace.getConfiguration('otakCommitter');
    return {
        openaiApiKey: config.get<string>('openaiApiKey'),
        githubToken: config.get<string>('github.token'),
        language: config.get<string>('language') || 'english',
        messageStyle: config.get<string>('messageStyle') || 'normal',
        useEmoji: config.get<boolean>('useEmoji') || false,
        reasoningEffort: config.get<ReasoningEffort>('reasoningEffort') || 'low',
    };
}

// File Helpers
export function cleanPath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

export function isSourceFile(filePath: string): boolean {
    const ignoredPatterns = [/node_modules/, /\.git/, /dist/, /build/, /\.vsix$/, /\.log$/];
    return !ignoredPatterns.some((pattern) => pattern.test(filePath));
}

// String Formatting
export function cleanMarkdown(text: string): string {
    return text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').replace(/#/g, '').trim();
}

export function formatMarkdown(text: string): string {
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line)
        .join('\n\n');
}

// Commit message sanitization - Re-export from sanitization module
export { sanitizeCommitMessage } from './sanitization';

// Dependency Analysis
export * from './dependencyAnalyzer';

// Robustness utilities
export * from './diffUtils';
export * from './sanitization';
export * from './errorHandling';
export * from './edgeCaseHandling';
