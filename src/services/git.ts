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
                await this.git.add(modifiedFiles);
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
            let diff = await this.git.diff(['--cached']);
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