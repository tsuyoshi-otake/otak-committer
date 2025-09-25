import * as vscode from 'vscode';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import { readFile } from 'fs/promises';
import { BaseService, BaseServiceFactory } from './base';
import { ServiceConfig, TemplateInfo } from '../types';
import { cleanPath, isSourceFile } from '../utils';

interface StatusResult {
    current: string;
    tracking: string | null;
    files: Array<{
        path: string;
        index: string;
        working_dir: string;
    }>;
}

export class GitService extends BaseService {
    protected git: SimpleGit;
    private workspaceRoot: string;
    // 100Kトークン制限
    // トークン切り詰め閾値 (200K)
    private static readonly TRUNCATE_THRESHOLD_TOKENS = 200 * 1000;
    // 1トークンあたりの推定文字数
    private static readonly CHARS_PER_TOKEN = 4;

    constructor(workspaceRoot: string, config?: Partial<ServiceConfig>) {
        super(config);
        this.workspaceRoot = workspaceRoot;
        this.git = simpleGit(workspaceRoot);

    }

    async getDiff(): Promise<string | undefined> {
        try {
            const status = await this.git.status();

            // 変更されたファイルのパスを取得（削除やリネームを含むすべての変更を対象に）
            const modifiedFiles = status.files
                .filter(file => file.working_dir !== ' ' || file.index !== ' ')  // 変更されたファイルまたは未追跡のファイルを含める
                .map(file => file.path);

            // ステージされていない変更があればステージング
            if (modifiedFiles.length > 0) {
                // ファイルを一つずつ追加（スペースを含むパスの問題を回避）
                for (const file of modifiedFiles) {
                    try {
                        // Windowsの予約デバイス名の場合は、--に続けてファイル名を指定
                        if (this.isWindowsReservedName(file)) {
                            // 予約名ファイルは明示的にパスとして指定
                            await this.git.raw(['add', '--', file]);
                        } else {
                            await this.git.add(file);
                        }
                    } catch (error) {
                        // 削除されたファイルの場合は git rm を試みる
                        if (error instanceof Error && error.message.includes('did not match any files')) {
                            try {
                                await this.git.rm(file);
                            } catch {
                                // すでに削除されている場合は無視
                            }
                        } else {
                            throw error;
                        }
                    }
                }
            }

            // 新しいステータスを取得
            const newStatus = await this.git.status();
            const stagedFiles = newStatus.files
                .filter(file => file.index !== ' ' || file.working_dir === '?')  // ステージされたファイルまたは未追跡のファイルを含める
                .map(file => file.path);

            if (stagedFiles.length === 0) {
                return undefined;
            }

            // 差分を取得
            let diff = '';

            // 予約名ファイルとそれ以外を分ける
            const reservedFiles = stagedFiles.filter(file => this.isWindowsReservedName(file));
            const normalFiles = stagedFiles.filter(file => !this.isWindowsReservedName(file));

            // 通常のファイルの差分を取得
            if (normalFiles.length > 0) {
                diff = await this.git.diff(['--cached']);
            }

            // 予約名ファイルがある場合は警告を表示し、ファイル名だけを差分に追加
            if (reservedFiles.length > 0) {
                const reservedFilesList = reservedFiles.join(', ');
                vscode.window.showInformationMessage(
                    `Files with reserved names (${reservedFilesList}) will be included but their content cannot be displayed in diff.`
                );

                // ファイル名だけを差分に追加
                if (diff) {
                    diff += '\n\n';
                }
                diff += `# Files with reserved names (content not available):\n`;
                reservedFiles.forEach(file => {
                    diff += `# - ${file}\n`;
                });
            }

            const tokenCount = Math.ceil(diff.length / GitService.CHARS_PER_TOKEN); // 大まかな推定

            // トークン数が閾値を超えた場合、切り詰めて警告を表示
            if (tokenCount > GitService.TRUNCATE_THRESHOLD_TOKENS) {
                const estimatedKTokens = Math.floor(tokenCount / 1000);
                const thresholdKTokens = Math.floor(GitService.TRUNCATE_THRESHOLD_TOKENS / 1000);
                const truncatedLength = GitService.TRUNCATE_THRESHOLD_TOKENS * GitService.CHARS_PER_TOKEN;
                
                vscode.window.showWarningMessage(
                    `Diff size (${estimatedKTokens}K tokens) exceeds the ${thresholdKTokens}K limit. The content will be truncated for AI processing.`
                );
                diff = diff.substring(0, truncatedLength);
            }
            
            return diff;
        } catch (error) {
            this.handleError(error);
        }
    }

    async getTrackedFiles(): Promise<string[]> {
        try {
            // git ls-files を使用して追跡されているファイルの一覧を取得
            const result = await this.git.raw(['ls-files']);
            return result
                .split('\n')
                .filter(file => file.trim() !== '')
                .map(file => cleanPath(path.join(this.workspaceRoot, file.trim())))
                .filter(isSourceFile);
        } catch (error) {
            this.handleError(error);
        }
    }

    async getStatus(): Promise<StatusResult> {
        try {
            const status = await this.git.status();
            return {
                current: status.current || '',
                tracking: status.tracking,
                files: status.files.map(file => ({
                    path: file.path,
                    index: file.index,
                    working_dir: file.working_dir
                }))
            };
        } catch (error) {
            this.handleError(error);
        }
    }

    async findTemplates(): Promise<{ commit?: TemplateInfo; pr?: TemplateInfo }> {
        const templates: { commit?: TemplateInfo; pr?: TemplateInfo } = {};
        const possiblePaths = [
            // コミットメッセージのテンプレート
            {
                type: 'commit' as const,
                paths: [
                    '.gitmessage',
                    '.github/commit_template',
                    '.github/templates/commit_template.md',
                    'docs/templates/commit_template.md'
                ]
            },
            // PRのテンプレート
            {
                type: 'pr' as const,
                paths: [
                    '.github/pull_request_template.md',
                    '.github/templates/pull_request_template.md',
                    'docs/templates/pull_request_template.md'
                ]
            }
        ];

        try {
            for (const template of possiblePaths) {
                for (const templatePath of template.paths) {
                    const fullPath = path.join(this.workspaceRoot, templatePath);
                    try {
                        const content = await readFile(fullPath, 'utf-8');
                        if (content) {
                            if (template.type === 'commit') {
                                templates.commit = {
                                    type: 'commit',
                                    content: content,
                                    path: templatePath
                                };
                                break; // コミットテンプレートが見つかったら他は探さない
                            } else {
                                templates.pr = {
                                    type: 'pr',
                                    content: content,
                                    path: templatePath
                                };
                                break; // PRテンプレートが見つかったら他は探さない
                            }
                        }
                    } catch (err) {
                        // ファイルが存在しない場合は次のパスを試す
                        continue;
                    }
                }
            }
        } catch (error) {
            this.showError('Error finding templates', error);
        }

        return templates;
    }

    async checkIsRepo(): Promise<boolean> {
        try {
            await this.git.checkIsRepo();
            return true;
        } catch {
            return false;
        }
    }

    private isWindowsReservedName(filePath: string): boolean {
        // Windowsの予約デバイス名
        const reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];

        // ファイル名部分を取得（パスの最後の部分）
        const fileName = path.basename(filePath);
        // 拡張子を除いたファイル名を取得
        const nameWithoutExt = fileName.split('.')[0];

        // 大文字小文字を無視して比較
        return reservedNames.some(reserved =>
            nameWithoutExt.toUpperCase() === reserved
        );
    }
}

export class GitServiceFactory extends BaseServiceFactory<GitService> {
    async create(config?: Partial<ServiceConfig>): Promise<GitService> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found');
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const service = new GitService(workspaceRoot, config);

        if (!await service.checkIsRepo()) {
            throw new Error('No Git repository found in the current workspace');
        }

        return service;
    }

    static async initialize(config?: Partial<ServiceConfig>): Promise<GitService | undefined> {
        try {
            const factory = new GitServiceFactory();
            return await factory.create(config);
        } catch (error) {
            console.error('Git repository check failed:', error);
            vscode.window.showErrorMessage(
                error instanceof Error 
                    ? error.message 
                    : 'Failed to initialize Git service'
            );
            return undefined;
        }
    }
}