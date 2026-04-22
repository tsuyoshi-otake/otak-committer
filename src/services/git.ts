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
import { t } from '../i18n';
import {
    buildIndexLockErrorMessage,
    GitRepositoryContext,
    resolveGitRepositoryContext,
    resolveRepositoryWorkspacePath,
} from './git.repository';

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
    private workspacePath: string;
    private repositoryContextPromise?: Promise<GitRepositoryContext>;
    private static readonly INDEX_LOCK_RETRY_DELAY_MS = 1000;

    constructor(workspacePath: string, config?: Partial<ServiceConfig>) {
        super(config);
        this.workspacePath = workspacePath;
        this.git = simpleGit(workspacePath);
    }

    private async getRepositoryContext(): Promise<GitRepositoryContext> {
        if (!this.repositoryContextPromise) {
            this.repositoryContextPromise = (async () => {
                const repositoryContext = await resolveGitRepositoryContext(
                    this.git,
                    this.workspacePath,
                );

                if (cleanPath(repositoryContext.rootPath) !== cleanPath(this.workspacePath)) {
                    this.logger.debug(
                        `Reinitializing git client at repository root: ${repositoryContext.rootPath}`,
                    );
                    this.git = simpleGit(repositoryContext.rootPath);
                }

                if (repositoryContext.isWorktree) {
                    this.logger.info(
                        `Git worktree detected: ${repositoryContext.rootPath} (git dir: ${repositoryContext.gitDir})`,
                    );
                }

                return repositoryContext;
            })();
        }

        return this.repositoryContextPromise;
    }

    private async collectDiff(globalState?: vscode.Memento): Promise<string | undefined> {
        try {
            const repositoryContext = await this.getRepositoryContext();
            return await collectDiff(
                this.git,
                this.logger,
                globalState,
                isWindowsReservedName,
                GitService.INDEX_LOCK_RETRY_DELAY_MS,
                buildIndexLockErrorMessage(t('git.busyIndexLock'), repositoryContext.gitDir),
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
            const repositoryContext = await this.getRepositoryContext();
            this.logger.debug('Getting tracked files');
            const result = await this.git.raw(['ls-files']);
            const files = result
                .split('\n')
                .filter((file) => file.trim() !== '')
                .map((file) => cleanPath(path.join(repositoryContext.rootPath, file.trim())))
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
            await this.getRepositoryContext();
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
        const repositoryContext = await this.getRepositoryContext();
        return findTemplates(repositoryContext.rootPath, this.logger);
    }

    async ensureRepositoryInitialized(): Promise<void> {
        try {
            this.logger.debug('Checking if directory is a git repository');
            await this.getRepositoryContext();
            this.logger.info('Git repository confirmed');
        } catch (error) {
            this.logger.warning('Not a git repository', error);
            this.repositoryContextPromise = undefined;
            throw error;
        }
    }

    async checkIsRepo(): Promise<boolean> {
        try {
            await this.ensureRepositoryInitialized();
            return true;
        } catch {
            return false;
        }
    }
}

export class GitServiceFactory extends BaseServiceFactory<GitService> {
    async create(config?: Partial<ServiceConfig>): Promise<GitService> {
        const workspacePath = await resolveRepositoryWorkspacePath();
        if (!workspacePath) {
            throw new Error('No workspace folder found');
        }

        const service = new GitService(workspacePath, config);

        try {
            await service.ensureRepositoryInitialized();
        } catch (error) {
            const rawReason = error instanceof Error ? error.message : String(error);
            const reason = rawReason.replace(/\s+/g, ' ').trim() || 'unknown error';
            throw new Error(
                `No Git repository found at "${workspacePath}" (${reason})`,
            );
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
