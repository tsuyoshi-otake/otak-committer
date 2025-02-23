import * as vscode from 'vscode';
import simpleGit, { SimpleGit, StatusResult as GitStatusResult } from 'simple-git';

interface StatusResult {
    current: string;
    tracking: string | null;
    files: Array<{
        path: string;
        index: string;
        working_dir: string;
    }>;
}

export class GitService {
    private git: SimpleGit;

    constructor(workspaceRoot: string) {
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
}