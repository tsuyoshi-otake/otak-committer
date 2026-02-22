import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { TokenManager } from './tokenManager';
import { FileAnalysis } from './issueGenerator.types';

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_FILE_PREVIEW_CHARS = 1000;

const FILE_TYPE_MAP: Record<string, string> = {
    ts: 'TypeScript',
    js: 'JavaScript',
    jsx: 'React JavaScript',
    tsx: 'React TypeScript',
    css: 'CSS',
    scss: 'SCSS',
    html: 'HTML',
    json: 'JSON',
    md: 'Markdown',
    py: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    go: 'Go',
    rs: 'Rust',
    php: 'PHP',
    rb: 'Ruby',
};

function getFileType(extension: string | undefined): string {
    return extension ? FILE_TYPE_MAP[extension] || 'Unknown' : 'Unknown';
}

async function isFileOversized(fileUri: vscode.Uri): Promise<boolean> {
    try {
        const stat = await vscode.workspace.fs.stat(fileUri);
        return typeof stat.size === 'number' && stat.size > MAX_FILE_BYTES;
    } catch {
        return false;
    }
}

async function analyzeOneFile(
    file: string,
    displayPath: string,
    type: string,
    totalTokens: number,
    maxTokensLimit: number,
    logger: Logger,
): Promise<{ analysis: FileAnalysis; totalTokens: number }> {
    try {
        const fileUri = vscode.Uri.file(file);

        if (await isFileOversized(fileUri)) {
            return {
                analysis: {
                    path: displayPath,
                    content: `... (content omitted: file larger than ${Math.floor(MAX_FILE_BYTES / 1024)}KB)`,
                    type,
                },
                totalTokens,
            };
        }

        const fileContent = await vscode.workspace.fs.readFile(fileUri);
        let content = new TextDecoder().decode(fileContent);
        if (content.length > MAX_FILE_PREVIEW_CHARS) {
            content = content.substring(0, MAX_FILE_PREVIEW_CHARS) + '\n... (content truncated)';
        }

        const estimatedTokens = TokenManager.estimateTokens(content);
        if (totalTokens + estimatedTokens > maxTokensLimit) {
            logger.warning(`Token limit reached, omitting content for ${displayPath}`);
            content = '... (content omitted due to token limit)';
        } else {
            totalTokens += estimatedTokens;
        }

        return { analysis: { path: displayPath, content, type }, totalTokens };
    } catch (error) {
        logger.warning(`Failed to analyze file ${displayPath}`, error);
        return {
            analysis: {
                path: displayPath,
                type,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            totalTokens,
        };
    }
}

export async function analyzeFiles(
    files: string[],
    maxTokensLimit: number,
    logger: Logger,
): Promise<FileAnalysis[]> {
    logger.info(`Analyzing ${files.length} files`);

    const analyses: FileAnalysis[] = [];
    let totalTokens = 0;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    for (const file of files) {
        const extension = file.split('.').pop()?.toLowerCase();
        const type = getFileType(extension);
        const displayPath = workspaceRoot
            ? path.relative(workspaceRoot, file).replace(/\\/g, '/')
            : file;

        if (totalTokens >= maxTokensLimit) {
            analyses.push({
                path: displayPath,
                content: '... (content omitted due to token limit)',
                type,
            });
            continue;
        }

        const result = await analyzeOneFile(
            file,
            displayPath,
            type,
            totalTokens,
            maxTokensLimit,
            logger,
        );
        totalTokens = result.totalTokens;
        analyses.push(result.analysis);
    }

    logger.info(`File analysis complete: ${analyses.length} files analyzed, ${totalTokens} tokens`);
    return analyses;
}

export function formatAnalysisResult(analyses: FileAnalysis[]): string {
    const parts: string[] = ['# Repository Analysis', ''];
    const groupedByType = analyses.reduce(
        (groups: Record<string, FileAnalysis[]>, analysis) => {
            const type = analysis.type || 'Unknown';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(analysis);
            return groups;
        },
        {},
    );

    for (const [type, files] of Object.entries(groupedByType)) {
        parts.push(`## ${type} Files`, '');
        for (const file of files) {
            parts.push(`### ${file.path}`, '');
            if (file.error) {
                parts.push(`Error: ${file.error}`, '');
            } else if (file.content) {
                parts.push('```' + (type.toLowerCase().includes('typescript') ? 'typescript' : ''));
                parts.push(file.content);
                parts.push('```', '');
            }
        }
    }

    return parts.join('\n');
}
