import * as vscode from 'vscode';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import { BaseService, BaseServiceFactory } from './base';
import { ServiceConfig, TemplateInfo } from '../types';
import { cleanPath, isSourceFile } from '../utils';
import { ErrorHandler } from '../infrastructure/error';
import { isWindowsReservedName } from '../utils/diffUtils';
import { collectDiff, truncateDiffByTokenLimit } from './git.diff';
import { findTemplates } from './git.templates';

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
    private static readonly INDEX_LOCK_RETRY_DELAY_MS = 1000;

    constructor(workspaceRoot: string, config?: Partial<ServiceConfig>) {
        super(config);
        this.workspaceRoot = workspaceRoot;
        this.git = simpleGit(workspaceRoot);
    }

    private async collectDiff(globalState?: vscode.Memento): Promise<string | undefined> {
        try {
            return await collectDiff(
                this.git,
                this.logger,
                globalState,
                isWindowsReservedName,
                GitService.INDEX_LOCK_RETRY_DELAY_MS,
            );
        } catch (error) {
            this.logger.error('Failed to get git diff', error);
            this.handleErrorAndRethrow(error);
        }
    }

    async getDiff(globalState?: vscode.Memento): Promise<string | undefined> {
        const diff = await this.collectDiff(globalState);
        if (!diff) {
            return undefined;
        }
        return truncateDiffByTokenLimit(diff, this.logger);
    }

    async getRawDiff(globalState?: vscode.Memento): Promise<string | undefined> {
        return this.collectDiff(globalState);
    }

    async getTrackedFiles(): Promise<string[]> {
        try {
            this.logger.debug('Getting tracked files');
            const result = await this.git.raw(['ls-files']);
            const files = result
                .split('\n')
                .filter((file) => file.trim() !== '')
                .map((file) => cleanPath(path.join(this.workspaceRoot, file.trim())))
                .filter(isSourceFile);
            this.logger.info(`Found ${files.length} tracked source files`);
            return files;
        } catch (error) {
            this.logger.error('Failed to get tracked files', error);
            this.handleErrorAndRethrow(error);
        }
    }

    async getStatus(): Promise<StatusResult> {
        try {
            this.logger.debug('Getting git status');
            const status = await this.git.status();
            this.logger.info(`Git status retrieved: ${status.files.length} files changed`);
            return {
                current: status.current || '',
                tracking: status.tracking,
                files: status.files.map((file) => ({
                    path: file.path,
                    index: file.index,
                    working_dir: file.working_dir,
                })),
            };
        } catch (error) {
            this.logger.error('Failed to get git status', error);
            this.handleErrorAndRethrow(error);
        }
    }

    async findTemplates(): Promise<{ commit?: TemplateInfo; pr?: TemplateInfo }> {
        return findTemplates(this.workspaceRoot, this.logger);
    }

    async checkIsRepo(): Promise<boolean> {
        try {
            this.logger.debug('Checking if directory is a git repository');
            await this.git.checkIsRepo();
            this.logger.info('Git repository confirmed');
            return true;
        } catch (error) {
            this.logger.warning('Not a git repository', error);
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

        if (!(await service.checkIsRepo())) {
            throw new Error('No Git repository found in the current workspace');
        }

        return service;
    }

    static async initialize(config?: Partial<ServiceConfig>): Promise<GitService | undefined> {
        try {
            const factory = new GitServiceFactory();
            return await factory.create(config);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'Initialize Git service',
                component: 'GitServiceFactory',
            });
            return undefined;
        }
    }
}
