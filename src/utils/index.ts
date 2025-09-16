import * as vscode from 'vscode';
import { ServiceConfig, ServiceError } from '../types';

// Configuration Management
export function getServiceConfig(): ServiceConfig {
    const config = vscode.workspace.getConfiguration('otakCommitter');
    return {
        openaiApiKey: config.get<string>('openaiApiKey'),
        githubToken: config.get<string>('github.token'),
        language: config.get<string>('language') || 'english',
        messageStyle: config.get<string>('messageStyle') || 'normal',
        useEmoji: config.get<boolean>('useEmoji') || false
    };
}

// Error Handling
export class ServiceException extends Error implements ServiceError {
    constructor(
        message: string,
        public code: string,
        public status?: number,
        public data?: any
    ) {
        super(message);
        this.name = 'ServiceException';
    }
}

export function handleServiceError(error: any): never {
    if (error instanceof ServiceException) {
        throw error;
    }

    if (error.response?.status) {
        throw new ServiceException(
            error.message,
            'API_ERROR',
            error.response.status,
            error.response.data
        );
    }

    throw new ServiceException(
        error.message || 'An unknown error occurred',
        'UNKNOWN_ERROR'
    );
}

// UI Helpers
export async function showConfigurationPrompt(
    message: string,
    settingKey: string
): Promise<boolean> {
    const response = await vscode.window.showWarningMessage(
        message,
        'Yes',
        'No'
    );

    if (response === 'Yes') {
        await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            settingKey
        );
        return true;
    }
    return false;
}

export async function showPreview<T>(
    content: T,
    title: string = 'Preview'
): Promise<boolean> {
    const preview = JSON.stringify(content, null, 2);
    const document = await vscode.workspace.openTextDocument({
        content: preview,
        language: 'json'
    });
    
    await vscode.window.showTextDocument(document, {
        preview: true,
        viewColumn: vscode.ViewColumn.Beside
    });

    const response = await vscode.window.showInformationMessage(
        'Is the preview content correct?',
        'Yes',
        'No'
    );

    return response === 'Yes';
}

// File Helpers
export function cleanPath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
}

export function isSourceFile(filePath: string): boolean {
    const ignoredPatterns = [
        /node_modules/,
        /\.git/,
        /dist/,
        /build/,
        /\.vsix$/,
        /\.log$/
    ];
    return !ignoredPatterns.some(pattern => pattern.test(filePath));
}

// String Formatting
export function cleanMarkdown(text: string): string {
    return text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/#/g, '')
        .trim();
}

export function formatMarkdown(text: string): string {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .join('\n\n');
}

// Commit message sanitization - Escapes dangerous characters while preserving legitimate usage
export function sanitizeCommitMessage(message: string): string {
    return message
        // Remove markdown code blocks that AI sometimes adds
        .replace(/^```[\s\S]*?\n/, '')
        .replace(/\n```$/, '')
        // Prevent command substitution attacks while preserving legitimate dollar signs
        .replace(/\$\(/g, '$(')  // Neutralize command substitution $(...)
        .replace(/\$\{/g, '${')  // Neutralize variable expansion ${...}
        // Convert backticks to single quotes for code references
        // This prevents command execution while keeping code references readable
        .replace(/`([^`]*)`/g, "'$1'")
        // Properly escape backslashes instead of removing them
        .replace(/\\/g, '\\\\')
        // Normalize quotes (replace smart quotes with regular ones)
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        // Normalize other typographic characters
        .replace(/—/g, '-')  // Em dash to hyphen
        .replace(/–/g, '-')  // En dash to hyphen
        .replace(/…/g, '...')  // Ellipsis to three dots
        // Remove control characters except newlines and tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Trim and ensure no leading/trailing whitespace
        .trim()
        // Ensure no multiple consecutive newlines
        .replace(/\n\s*\n/g, '\n\n')
        // Remove any trailing periods from subject line (first line)
        .replace(/^([^\n]+)\.(\n|$)/, '$1$2');
}