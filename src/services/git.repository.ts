import * as path from 'path';
import { SimpleGit } from 'simple-git';

/**
 * Resolved paths describing a git repository, including worktree metadata.
 */
export interface GitRepositoryContext {
    workspacePath: string;
    rootPath: string;
    gitDir: string;
    commonDir: string;
    isWorktree: boolean;
}

interface RootUriLike {
    fsPath: string;
}

function cleanGitPath(targetPath: string): string {
    return targetPath.replace(/\\/g, '/');
}

function isWindowsAbsolutePath(targetPath: string): boolean {
    return /^[A-Za-z]:[\\/]/.test(targetPath) || /^[/\\]{2}[^/\\]+[/\\][^/\\]+/.test(targetPath);
}

function resolveGitPath(targetPath: string): string {
    if (isWindowsAbsolutePath(targetPath)) {
        return cleanGitPath(path.win32.resolve(targetPath));
    }
    return cleanGitPath(path.resolve(targetPath));
}

function resolveGitPathFrom(workspacePath: string, targetPath: string): string {
    if (isWindowsAbsolutePath(targetPath) || path.isAbsolute(targetPath)) {
        return resolveGitPath(targetPath);
    }

    if (isWindowsAbsolutePath(workspacePath)) {
        return cleanGitPath(path.win32.resolve(workspacePath, targetPath));
    }

    return cleanGitPath(path.resolve(workspacePath, targetPath));
}

/**
 * Subset of the VS Code Git extension repository surface used by this extension.
 */
export interface GitApiRepository {
    rootUri?: RootUriLike;
    inputBox?: { value: string };
    state: { HEAD?: { name?: string } };
    ui?: { selected: boolean };
    getConfig(key: string): Promise<string | undefined>;
}

/**
 * Subset of the VS Code Git extension API exposing the repository list.
 */
export interface GitExtensionAPI {
    repositories: GitApiRepository[];
}

interface VSCodeExtensionLike {
    isActive: boolean;
    exports?: unknown;
    activate(): Promise<unknown>;
}

function normalizeForComparison(targetPath: string): string {
    const normalized = resolveGitPath(targetPath);
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function isPathWithin(parentPath: string, childPath: string): boolean {
    const normalizedParent = normalizeForComparison(parentPath);
    const normalizedChild = normalizeForComparison(childPath);

    return (
        normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}/`)
    );
}

async function revParsePath(
    git: SimpleGit,
    workspacePath: string,
    args: string[],
): Promise<string> {
    try {
        const absolutePath = await git.raw(['rev-parse', '--path-format=absolute', ...args]);
        return cleanGitPath(absolutePath.trim());
    } catch {
        const rawPath = (await git.raw(['rev-parse', ...args])).trim();
        return resolveGitPathFrom(workspacePath, rawPath);
    }
}

/**
 * Resolve the repository context (root, git dir, worktree status) for a workspace
 *
 * @param git - The simple-git client bound to the workspace
 * @param workspacePath - Filesystem path of the workspace being inspected
 * @returns The resolved GitRepositoryContext describing the repository layout
 */
export async function resolveGitRepositoryContext(
    git: SimpleGit,
    workspacePath: string,
): Promise<GitRepositoryContext> {
    const rootPath = cleanGitPath((await git.raw(['rev-parse', '--show-toplevel'])).trim());
    const gitDir = cleanGitPath((await git.raw(['rev-parse', '--absolute-git-dir'])).trim());
    const commonDir = await revParsePath(git, workspacePath, ['--git-common-dir']);

    return {
        workspacePath: cleanGitPath(workspacePath),
        rootPath,
        gitDir,
        commonDir,
        isWorktree: normalizeForComparison(gitDir) !== normalizeForComparison(commonDir),
    };
}

function resolveWorkspacePath(): string | undefined {
    let vscodeModule: typeof import('vscode');
    try {
        vscodeModule = require('vscode') as typeof import('vscode');
    } catch {
        return undefined;
    }

    const activeDocumentUri = vscodeModule.window.activeTextEditor?.document.uri;
    if (activeDocumentUri?.scheme === 'file') {
        const activeWorkspace = vscodeModule.workspace.getWorkspaceFolder(activeDocumentUri);
        if (activeWorkspace) {
            return activeWorkspace.uri.fsPath;
        }
    }

    return vscodeModule.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Pick the most relevant repository for a given filesystem path
 *
 * @param repositories - Candidate repositories from the Git extension API
 * @param targetPath - Path used to find the closest matching repository
 * @returns The best-matching repository, or undefined when none are available
 */
export function selectRepositoryForPath(
    repositories: GitApiRepository[],
    targetPath: string | undefined,
): GitApiRepository | undefined {
    if (repositories.length === 0) {
        return undefined;
    }

    const selectedRepository = repositories.find((repository) => repository.ui?.selected === true);
    if (selectedRepository) {
        return selectedRepository;
    }

    if (!targetPath) {
        return repositories[0];
    }

    const containingRepositories = repositories
        .filter(
            (repository): repository is GitApiRepository & { rootUri: RootUriLike } =>
                !!repository.rootUri,
        )
        .filter((repository) => isPathWithin(repository.rootUri.fsPath, targetPath))
        .sort(
            (left, right) =>
                normalizeForComparison(right.rootUri.fsPath).length -
                normalizeForComparison(left.rootUri.fsPath).length,
        );

    if (containingRepositories.length > 0) {
        return containingRepositories[0];
    }

    return (
        repositories.find(
            (repository) =>
                repository.rootUri && isPathWithin(targetPath, repository.rootUri.fsPath),
        ) ?? repositories[0]
    );
}

/**
 * Get the repository corresponding to the active workspace folder
 *
 * @param gitApi - The VS Code Git extension API
 * @returns The repository matching the current workspace, or undefined when unavailable
 */
export function getRepositoryForCurrentWorkspace(
    gitApi: GitExtensionAPI,
): GitApiRepository | undefined {
    return selectRepositoryForPath(gitApi.repositories, resolveWorkspacePath());
}

async function loadGitExtensionApi(): Promise<GitExtensionAPI | undefined> {
    let vscodeModule: typeof import('vscode');
    try {
        vscodeModule = require('vscode') as typeof import('vscode');
    } catch {
        return undefined;
    }

    const gitExtension = vscodeModule.extensions?.getExtension?.('vscode.git') as
        | VSCodeExtensionLike
        | undefined;
    if (!gitExtension) {
        return undefined;
    }

    try {
        const exported = (await gitExtension.activate()) as
            | { getAPI?: (version: number) => GitExtensionAPI }
            | undefined;
        return exported?.getAPI?.(1);
    } catch {
        return undefined;
    }
}

/**
 * Resolve the workspace path that should be used as the repository root
 *
 * @returns The repository root path, falling back to the active workspace when needed
 */
export async function resolveRepositoryWorkspacePath(): Promise<string | undefined> {
    const workspacePath = resolveWorkspacePath();
    const gitApi = await loadGitExtensionApi();
    const repository = gitApi
        ? selectRepositoryForPath(gitApi.repositories ?? [], workspacePath)
        : undefined;

    return repository?.rootUri?.fsPath ?? workspacePath;
}

/**
 * Build a user-facing error message that includes the actual index.lock path
 *
 * @param baseMessage - The localized template message
 * @param gitDir - Absolute path to the .git directory holding the lock file
 * @returns The error message with the resolved index.lock path embedded
 */
export function buildIndexLockErrorMessage(baseMessage: string, gitDir: string): string {
    const indexLockPath = cleanGitPath(path.join(gitDir, 'index.lock'));
    if (baseMessage.includes('.git/index.lock')) {
        return baseMessage.replace('.git/index.lock', indexLockPath);
    }
    return `${baseMessage} (${indexLockPath})`;
}
