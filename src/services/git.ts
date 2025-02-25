import * as vscode from 'vscode';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';

interface StatusResult {
    current: string;
    tracking: string | null;
    files: Array<{
        path: string;
        index: string;
        working_dir: string;
    }>;
}

export interface TemplateInfo {
    type: 'commit' | 'pr';
    content: string;
    path: string;
}

export class GitService {
    private git: SimpleGit;
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.git = simpleGit(workspaceRoot);
    }

    static async initialize(): Promise<GitService | undefined> {
        // ワークスペースのルートパスを取得
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder found');
            return undefined;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const git = new GitService(workspaceRoot);

        try {
            // Gitリポジトリかどうかを確認
            await git.git.checkIsRepo();
            return git;
        } catch (error) {
            console.error('Git repository check failed:', error);
            vscode.window.showErrorMessage('No Git repository found in the current workspace');
            return undefined;
        }
    }

    async getDiff(): Promise<string> {
        try {
            const status = await this.git.status();
            
            // 変更されたファイルのパスを取得
            const modifiedFiles = status.files
                .filter(file => file.working_dir === 'M' || file.working_dir === 'A')
                .map(file => file.path);

            // ステージされていない変更があればステージング
            if (modifiedFiles.length > 0) {
                await this.git.add(modifiedFiles);
            }

            // 新しいステータスを取得
            const newStatus = await this.git.status();
            const stagedFiles = newStatus.files
                .filter(file => file.index === 'M' || file.index === 'A')
                .map(file => file.path);

            if (stagedFiles.length === 0) {
                throw new Error('No changes to commit');
            }

            // 差分を取得
            const diff = await this.git.diff(['--cached']);
            return diff;
        } catch (error: any) {
            console.error('Error getting diff:', error);
            throw error;
        }
    }

    async getTrackedFiles(): Promise<string[]> {
        try {
            // git ls-files を使用して追跡されているファイルの一覧を取得
            const result = await this.git.raw(['ls-files']);
            return result
                .split('\n')
                .filter(file => file.trim() !== '')
                .map(file => path.join(this.workspaceRoot, file.trim()));
        } catch (error: any) {
            console.error('Error getting tracked files:', error);
            throw new Error(`Failed to get tracked files: ${error.message}`);
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
        } catch (error: any) {
            console.error('Error getting status:', error);
            throw new Error(`Failed to get status: ${error.message}`);
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
                        const content = await fs.readFile(fullPath, 'utf-8');
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
            console.error('Error finding templates:', error);
        }

        return templates;
    }
}