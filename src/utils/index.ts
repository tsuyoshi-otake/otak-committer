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

// Robustness utilities
export * from './diffUtils';
export * from './sanitization';
export * from './secretDetection';
export * from './errorHandling';
