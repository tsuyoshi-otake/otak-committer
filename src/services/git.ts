import * as vscode from 'vscode';
const simpleGit = require('simple-git');

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
    private git: any;

    constructor() {
        this.git = simpleGit();
    }

    static async initialize(): Promise<GitService | undefined> {
        const git = new GitService();
        try {
            await git.git.status();
            return git;
        } catch (error) {
            vscode.window.showErrorMessage('No Git repository found');
            return undefined;
        }
    }

    async getDiff(): Promise<string> {
        const status = await this.git.status();
        const stagedFiles = status.staged;
        const modifiedFiles = status.modified;

        // ステージされていない変更があればステージング
        if (modifiedFiles.length > 0) {
            await this.git.add(modifiedFiles);
        }

        // 差分を取得
        const diff = await this.git.diff(['--cached']);
        return diff;
    }

    async commit(message: string): Promise<void> {
        try {
            await this.git.commit(message);
        } catch (error: any) {
            throw new Error(`Failed to commit: ${error.message}`);
        }
    }

    async getStatus(): Promise<StatusResult> {
        const status = await this.git.status();
        return {
            current: status.current,
            tracking: status.tracking,
            files: status.files.map((file: any) => ({
                path: file.path,
                index: file.index,
                working_dir: file.working_dir
            }))
        };
    }
}