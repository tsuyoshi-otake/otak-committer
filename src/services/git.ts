import * as vscode from 'vscode';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import { readFile } from 'fs/promises';
import { BaseService, BaseServiceFactory } from './base';
import { ServiceConfig, TemplateInfo } from '../types';
import { cleanPath, isSourceFile } from '../utils';
import { ErrorHandler } from '../infrastructure/error';
import { TokenManager } from './tokenManager';
import { isWindowsReservedName } from '../utils/diffUtils';
import { t } from '../i18n/index.js';

/**
 * Git status result
 */
interface StatusResult {
    /** Current branch name */
    current: string;
    /** Tracking branch name */
    tracking: string | null;
    /** List of changed files */
    files: Array<{
        path: string;
        index: string;
        working_dir: string;
    }>;
}

/**
 * Service for Git repository operations
 *
 * Provides methods for interacting with Git repositories including
 * getting diffs, tracking files, finding templates, and checking repository status.
 *
 * @example
 * ```typescript
 * const git = await GitService.initialize();
 * const diff = await git.getDiff();
 * const files = await git.getTrackedFiles();
 * ```
 */
export class GitService extends BaseService {
    protected git: SimpleGit;
    private workspaceRoot: string;

    constructor(workspaceRoot: string, config?: Partial<ServiceConfig>) {
        super(config);
        this.workspaceRoot = workspaceRoot;
        this.git = simpleGit(workspaceRoot);
    }

    /**
     * Collect the raw diff without truncation (shared logic)
     *
     * Contains all diff collection logic: status check, staging prompt,
     * file staging, cached diff retrieval, and reserved file info.
     * Does NOT apply truncation — callers are responsible for token management.
     *
     * @returns The raw Git diff string or undefined if no changes
     */
    private async collectDiff(globalState?: vscode.Memento): Promise<string | undefined> {
        try {
            this.logger.debug('Getting git diff');
            const status = await this.git.status();

            const modifiedFiles = status.files
                .filter((file) => file.working_dir !== ' ' || file.index !== ' ')
                .map((file) => file.path);

            this.logger.debug(`Found ${modifiedFiles.length} modified files`);

            const reservedNameFiles = modifiedFiles.filter((file) => isWindowsReservedName(file));
            const hasStagedChanges = status.files.some(
                (file) => file.index !== ' ' && file.index !== '?' && file.index !== '!',
            );

            let diff = hasStagedChanges ? await this.git.diff(['--cached']) : '';

            if (!hasStagedChanges && modifiedFiles.length > 0) {
                const shouldStage = await this.promptForStaging(globalState);
                if (!shouldStage) {
                    return undefined;
                }
                await this.stageFiles(modifiedFiles, reservedNameFiles);
                diff = await this.git.diff(['--cached']);
            }

            if ((!diff || diff.trim() === '') && reservedNameFiles.length === 0) {
                this.logger.info('No staged files found');
                return undefined;
            }

            this.logger.info(`Processing diff, ${reservedNameFiles.length} reserved name files`);
            diff = this.appendReservedFileInfo(diff, reservedNameFiles);

            this.logger.info('Git diff retrieved successfully');
            return diff;
        } catch (error) {
            this.logger.error('Failed to get git diff', error);
            this.handleErrorAndRethrow(error);
        }
    }

    /**
     * Get the Git diff for staged changes (with truncation for backward compatibility)
     *
     * Automatically stages modified files and retrieves the diff.
     * Handles Windows reserved filenames and truncates large diffs.
     *
     * @returns The Git diff string or undefined if no changes
     *
     * @example
     * ```typescript
     * const diff = await git.getDiff();
     * if (diff) {
     *   console.log('Changes detected:', diff);
     * }
     * ```
     */
    async getDiff(globalState?: vscode.Memento): Promise<string | undefined> {
        const diff = await this.collectDiff(globalState);
        if (!diff) {
            return undefined;
        }
        return this.truncateDiffByTokenLimit(diff);
    }

    /**
     * Get the raw Git diff without truncation
     *
     * Used by DiffProcessor for smart diff processing (Tier 2/3).
     * The caller is responsible for managing token limits.
     *
     * @returns The raw Git diff string or undefined if no changes
     *
     * @example
     * ```typescript
     * const rawDiff = await git.getRawDiff();
     * if (rawDiff) {
     *   const result = await diffProcessor.process(rawDiff, tokenBudget);
     * }
     * ```
     */
    async getRawDiff(globalState?: vscode.Memento): Promise<string | undefined> {
        return this.collectDiff(globalState);
    }

    /**
     * Prompt user for staging confirmation
     * @returns true if user agrees to stage, false if cancelled
     */
    private async promptForStaging(globalState?: vscode.Memento): Promise<boolean> {
        const alwaysStage = globalState?.get<boolean>('otak-committer.alwaysStageAll', false);
        if (alwaysStage) {
            return true;
        }

        const stageAllLabel = t('git.stageAll');
        const alwaysStageLabel = t('git.alwaysStageAll');
        const action = await vscode.window.showInformationMessage(
            t('git.stageAllPrompt'),
            stageAllLabel,
            alwaysStageLabel,
            t('apiKey.cancel'),
        );

        if (action === alwaysStageLabel) {
            await globalState?.update('otak-committer.alwaysStageAll', true);
            this.logger.info('User chose to always stage changes');
            return true;
        }

        if (action !== stageAllLabel) {
            this.logger.info('User cancelled staging changes for diff generation');
            return false;
        }

        return true;
    }

    /** Delay before retrying after index.lock error (ms) */
    private static readonly INDEX_LOCK_RETRY_DELAY_MS = 1000;

    /**
     * Stage files for commit, with fallback to per-file staging
     */
    private async stageFiles(modifiedFiles: string[], reservedNameFiles: string[]): Promise<void> {
        try {
            await this.git.add(['-A']);
        } catch (error) {
            if (error instanceof Error && error.message.includes('index.lock')) {
                this.logger.warning('Git index.lock detected, retrying after delay...');
                await new Promise((resolve) =>
                    setTimeout(resolve, GitService.INDEX_LOCK_RETRY_DELAY_MS),
                );
                try {
                    await this.git.add(['-A']);
                    return;
                } catch (retryError) {
                    this.logger.error('Git index.lock error persists after retry', retryError);
                    vscode.window.showErrorMessage(t('git.busyIndexLock'));
                    throw retryError;
                }
            }

            const addableFiles = modifiedFiles.filter((file) => !isWindowsReservedName(file));
            if (reservedNameFiles.length > 0) {
                this.logger.warning(
                    `Skipping Windows reserved name files during staging: ${reservedNameFiles.join(', ')}`,
                );
            }

            for (const file of addableFiles) {
                await this.stageFile(file);
            }
        }
    }

    /**
     * Stage a single file with error handling
     */
    private async stageFile(file: string): Promise<void> {
        try {
            await this.git.add(file);
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }
            if (error.message.includes('index.lock')) {
                this.logger.error('Git index.lock error detected', error);
                vscode.window.showErrorMessage(t('git.busyIndexLock'));
                throw error;
            }
            if (error.message.includes('did not match any files')) {
                try {
                    await this.git.rm(file);
                } catch {
                    /* Ignore if already deleted */
                }
                return;
            }
            throw error;
        }
    }

    /**
     * Append reserved file names info to the diff
     */
    private appendReservedFileInfo(diff: string, reservedNameFiles: string[]): string {
        if (reservedNameFiles.length === 0) {
            return diff;
        }

        const reservedFilesList = reservedNameFiles.join(', ');
        this.logger.warning(`Files with reserved names found: ${reservedFilesList}`);
        vscode.window.showInformationMessage(
            t('git.reservedNamesInfo', { files: reservedFilesList }),
        );

        let result = diff;
        if (result && result.trim() !== '') {
            result += '\n\n';
        }
        result += `# Files with reserved names (content not available):\n`;
        reservedNameFiles.forEach((file) => {
            result += `# - ${file}\n`;
        });
        return result;
    }

    /**
     * Truncate diff content if it exceeds the token limit
     */
    private truncateDiffByTokenLimit(diff: string): string {
        const truncateThresholdTokens = TokenManager.getConfiguredMaxTokens();
        const tokenCount = TokenManager.estimateTokens(diff);

        if (tokenCount <= truncateThresholdTokens) {
            return diff;
        }

        const estimatedKTokens = Math.floor(tokenCount / 1000);
        const thresholdKTokens = Math.floor(truncateThresholdTokens / 1000);
        const truncatedLength = truncateThresholdTokens * TokenManager.CHARS_PER_TOKEN;

        this.logger.warning(
            `Diff size (${estimatedKTokens}K tokens) exceeds ${thresholdKTokens}K limit, truncating`,
        );
        vscode.window.showWarningMessage(
            t('git.diffTruncatedWarning', { estimatedKTokens, thresholdKTokens }),
        );
        return diff.substring(0, truncatedLength);
    }

    /**
     * Get all tracked source files in the repository
     *
     * Uses `git ls-files` to retrieve tracked files and filters
     * to include only source code files.
     *
     * @returns Array of tracked source file paths
     *
     * @example
     * ```typescript
     * const files = await git.getTrackedFiles();
     * console.log(`Found ${files.length} tracked files`);
     * ```
     */
    async getTrackedFiles(): Promise<string[]> {
        try {
            this.logger.debug('Getting tracked files');
            // git ls-files を使用して追跡されているファイルの一覧を取得
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

    /**
     * Get the current Git repository status
     *
     * @returns Status information including current branch and changed files
     *
     * @example
     * ```typescript
     * const status = await git.getStatus();
     * console.log(`On branch: ${status.current}`);
     * console.log(`Changed files: ${status.files.length}`);
     * ```
     */
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

    /**
     * Find commit and PR templates in the repository
     *
     * Searches common locations for commit message and pull request templates.
     *
     * @returns Object containing found templates (commit and/or pr)
     *
     * @example
     * ```typescript
     * const templates = await git.findTemplates();
     * if (templates.commit) {
     *   console.log('Found commit template:', templates.commit.path);
     * }
     * ```
     */
    async findTemplates(): Promise<{ commit?: TemplateInfo; pr?: TemplateInfo }> {
        const templateDefs = [
            {
                type: 'commit' as const,
                paths: [
                    '.gitmessage',
                    '.github/commit_template',
                    '.github/templates/commit_template.md',
                    'docs/templates/commit_template.md',
                ],
            },
            {
                type: 'pr' as const,
                paths: [
                    '.github/pull_request_template.md',
                    '.github/templates/pull_request_template.md',
                    'docs/templates/pull_request_template.md',
                ],
            },
        ];

        const templates: { commit?: TemplateInfo; pr?: TemplateInfo } = {};

        this.logger.debug('Searching for templates');
        for (const def of templateDefs) {
            const found = await this.tryReadFirstTemplate(def.type, def.paths);
            if (found) {
                templates[def.type] = found;
            }
        }

        return templates;
    }

    /**
     * Try to read the first available template from a list of paths
     */
    /** Maximum template file size (100 KB) to prevent resource exhaustion */
    private static readonly MAX_TEMPLATE_BYTES = 100 * 1024;

    private async tryReadFirstTemplate(
        type: 'commit' | 'pr',
        paths: string[],
    ): Promise<TemplateInfo | undefined> {
        for (const templatePath of paths) {
            const fullPath = path.join(this.workspaceRoot, templatePath);
            try {
                const content = await readFile(fullPath, 'utf-8');
                if (content) {
                    if (Buffer.byteLength(content, 'utf-8') > GitService.MAX_TEMPLATE_BYTES) {
                        this.logger.warning(
                            `Template at ${templatePath} exceeds size limit, skipping`,
                        );
                        continue;
                    }
                    this.logger.info(`Found ${type} template at ${templatePath}`);
                    return { type, content, path: templatePath };
                }
            } catch {
                // File doesn't exist, try next path
            }
        }
        return undefined;
    }

    /**
     * Check if the current directory is a Git repository
     *
     * @returns True if the directory is a Git repository, false otherwise
     *
     * @example
     * ```typescript
     * if (await git.checkIsRepo()) {
     *   console.log('This is a Git repository');
     * }
     * ```
     */
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

/**
 * Factory for creating Git service instances
 *
 * Handles service initialization and workspace validation.
 */
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
