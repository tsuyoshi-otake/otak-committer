import * as path from 'path';
import { SimpleGit } from 'simple-git';

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

export interface GitApiRepository {
    rootUri?: RootUriLike;
    inputBox?: { value: string };
    state: { HEAD?: { name?: string } };
    ui?: { selected: boolean };
    getConfig(key: string): Promise<string | undefined>;
}

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

export function resolveWorkspacePath(): string | undefined {
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

export async function resolveRepositoryWorkspacePath(): Promise<string | undefined> {
    const workspacePath = resolveWorkspacePath();
    const gitApi = await loadGitExtensionApi();
    const repository = gitApi
        ? selectRepositoryForPath(gitApi.repositories ?? [], workspacePath)
        : undefined;

    return repository?.rootUri?.fsPath ?? workspacePath;
}

export function buildIndexLockErrorMessage(baseMessage: string, gitDir: string): string {
    const indexLockPath = cleanGitPath(path.join(gitDir, 'index.lock'));
    if (baseMessage.includes('.git/index.lock')) {
        return baseMessage.replace('.git/index.lock', indexLockPath);
    }
    return `${baseMessage} (${indexLockPath})`;
}
