import * as vscode from 'vscode';
import { GitChange, GitCommitOptions, GitConfig, GitOperationError } from '../types/git';

// VS Code Git API型定義
interface Repository {
    state: {
        workingTreeChanges: {
            uri: vscode.Uri;
            status: number;
        }[];
        HEAD?: {
            name?: string;
            commit?: {
                author?: {
                    name?: string;
                    email?: string;
                };
            };
        };
        remotes: {
            name: string;
            fetchUrl?: string;
            pushUrl?: string;
            isReadOnly: boolean;
        }[];
    };
    add: (paths: string[]) => Promise<void>;
    commit: (message: string, options?: { all?: boolean }) => Promise<void>;
    show: (uri: vscode.Uri) => Promise<string>;
}

export class GitService {
    constructor(private repository: Repository) {}

    /**
     * GitServiceのインスタンスを初期化
     */
    static async initialize(): Promise<GitService | undefined> {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (!gitExtension) {
            vscode.window.showErrorMessage('Git extension is not available');
            return undefined;
        }

        const api = gitExtension.getAPI(1);
        const repositories = api.repositories;

        if (repositories.length === 0) {
            vscode.window.showErrorMessage('No Git repository found');
            return undefined;
        }

        return new GitService(repositories[0]);
    }

    /**
     * 現在の変更を取得
     */
    async getChanges(): Promise<GitChange[]> {
        try {
            const changes: GitChange[] = [];
            const resources = this.repository.state.workingTreeChanges;

            for (const resource of resources) {
                const uri = resource.uri;
                const status = this.getChangeStatus(resource.status);
                const patch = await this.getDiff(uri);

                changes.push({
                    file: vscode.workspace.asRelativePath(uri),
                    status,
                    patch
                });
            }

            return changes;
        } catch (error: any) {
            throw new GitOperationError(
                `Failed to get changes: ${error.message}`,
                error.code,
                error.command
            );
        }
    }

    /**
     * ファイルの差分を取得
     */
    private async getDiff(uri: vscode.Uri): Promise<string | undefined> {
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const originalContent = (await this.repository.show(uri)) || '';
            const currentContent = document.getText();

            return this.createPatch(originalContent, currentContent);
        } catch {
            return undefined; // バイナリファイルなどの場合
        }
    }

    /**
     * パッチ形式の差分を生成
     */
    private createPatch(original: string, modified: string): string {
        const originalLines = original.split('\n');
        const modifiedLines = modified.split('\n');
        let patch = '';

        for (let i = 0; i < modifiedLines.length; i++) {
            if (i >= originalLines.length || originalLines[i] !== modifiedLines[i]) {
                patch += `+${modifiedLines[i]}\n`;
            } else {
                patch += ` ${modifiedLines[i]}\n`;
            }
        }

        for (let i = modifiedLines.length; i < originalLines.length; i++) {
            patch += `-${originalLines[i]}\n`;
        }

        return patch;
    }

    /**
     * 変更のステータスを変換
     */
    private getChangeStatus(status: number): GitChange['status'] {
        switch (status) {
            case 1: return 'modified';
            case 2: return 'added';
            case 3: return 'deleted';
            case 4: return 'renamed';
            case 5: return 'copied';
            default: return 'modified';
        }
    }

    /**
     * 全ての変更をステージング
     */
    async stageAll(): Promise<void> {
        try {
            const paths = this.repository.state.workingTreeChanges.map(change => change.uri.fsPath);
            await this.repository.add(paths);
        } catch (error: any) {
            throw new GitOperationError(
                `Failed to stage changes: ${error.message}`,
                error.code,
                error.command
            );
        }
    }

    /**
     * コミットを実行
     */
    async commit(message: string, options: Partial<GitCommitOptions> = {}): Promise<void> {
        try {
            await this.repository.commit(message, { ...options, all: true });
        } catch (error: any) {
            throw new GitOperationError(
                `Failed to commit: ${error.message}`,
                error.code,
                error.command
            );
        }
    }

    /**
     * Git設定を取得
     */
    getConfig(): GitConfig {
        return {
            email: this.repository.state.HEAD?.commit?.author?.email,
            name: this.repository.state.HEAD?.commit?.author?.name,
            remote: this.repository.state.remotes[0]?.name
        };
    }

    /**
     * カレントブランチ名を取得
     */
    getCurrentBranch(): string | undefined {
        return this.repository.state.HEAD?.name;
    }
}