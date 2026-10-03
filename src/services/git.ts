import * as vscode from 'vscode';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import { BaseService, BaseServiceFactory } from './base';
import { ServiceConfig, TemplateInfo } from '../types';
import { cleanPath, isSourceFile, splitNulSeparatedPaths } from '../utils';
import { ErrorHandler } from '../infrastructure/error';
import { isWindowsReservedName } from '../utils/diffUtils';
import { CollectedDiff, collectDiff } from './git.diff';
import { unstagePaths } from './git.staging';
import { findTemplates } from './git.templates';
import { t } from '../i18n';
import {
    buildIndexLockErrorMessage,
    GitRepositoryContext,
    resolveGitRepositoryContext,
    resolveRepositoryTarget,
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

/**
 * High-level git service that wraps simple-git with VS Code aware diagnostics
 * and exposes diff, status, and template helpers used by the extension commands.
 */
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

    /**
     * Collect the staged diff, staging changes first (with the user's consent) when nothing is staged
     *
     * @param globalState - VS Code global state holding the always-stage preference
     * @returns The diff and the paths the extension staged, or undefined when there is nothing to commit
     */
    async getRawDiff(globalState?: vscode.Memento): Promise<CollectedDiff | undefined> {
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

    /**
     * Unstage paths the extension staged for a commit message that was not applied
     *
     * @param paths - The `stagedByExtension` paths from {@link getRawDiff}
     */
    async unstagePaths(paths: readonly string[]): Promise<void> {
        if (paths.length === 0) {
            return;
        }
        await this.getRepositoryContext();
        await unstagePaths(this.git, paths);
        this.logger.info(`Unstaged ${paths.length} path(s) staged by the extension`);
    }

    async getTrackedFiles(): Promise<string[]> {
        try {
            const repositoryContext = await this.getRepositoryContext();
            this.logger.debug('Getting tracked files');
            // -z keeps non-ASCII and special-character paths unquoted.
            const result = await this.git.raw(['ls-files', '-z']);
            const files = splitNulSeparatedPaths(result)
                .map((file) => cleanPath(path.join(repositoryContext.rootPath, file)))
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

/**
 * Factory that resolves the active workspace and constructs a ready-to-use GitService.
 */
export class GitServiceFactory extends BaseServiceFactory<GitService> {
    /**
     * @param config - Optional service configuration
     * @param repositoryPath - Repository already resolved by the caller; resolved here when omitted
     */
    async create(config?: Partial<ServiceConfig>, repositoryPath?: string): Promise<GitService> {
        const workspacePath = repositoryPath ?? (await resolveRepositoryTarget()).workspacePath;
        if (!workspacePath) {
            throw new Error(t('errors.noWorkspaceFolder'));
        }

        const service = new GitService(workspacePath, config);

        try {
            await service.ensureRepositoryInitialized();
        } catch (error) {
            const rawReason = error instanceof Error ? error.message : String(error);
            const reason = rawReason.replace(/\s+/g, ' ').trim() || t('errors.unknownError');
            throw new Error(t('errors.noGitRepositoryAtPath', { path: workspacePath, reason }));
        }

        return service;
    }

    static async initialize(
        config?: Partial<ServiceConfig>,
        repositoryPath?: string,
    ): Promise<GitService | undefined> {
        try {
            const factory = new GitServiceFactory();
            return await factory.create(config, repositoryPath);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: t('operations.initializingGitService'),
                component: 'GitServiceFactory',
            });
            return undefined;
        }
    }
}
