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

export interface GitApiRepository {
    rootUri?: RootUriLike;
    inputBox?: { value: string };
    state: { HEAD?: { name?: string } };
    getConfig(key: string): Promise<string | undefined>;
}

export interface GitExtensionAPI {
    repositories: GitApiRepository[];
}

function normalizeForComparison(targetPath: string): string {
    const normalized = cleanGitPath(path.resolve(targetPath));
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function isPathWithin(parentPath: string, childPath: string): boolean {
    const normalizedParent = normalizeForComparison(parentPath);
    const normalizedChild = normalizeForComparison(childPath);

    return (
        normalizedChild === normalizedParent ||
        normalizedChild.startsWith(`${normalizedParent}/`)
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
        const resolvedPath = path.isAbsolute(rawPath)
            ? rawPath
            : path.resolve(workspacePath, rawPath);
        return cleanGitPath(resolvedPath);
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

    if (!targetPath) {
        return repositories[0];
    }

    const containingRepositories = repositories
        .filter((repository): repository is GitApiRepository & { rootUri: RootUriLike } =>
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

export function buildIndexLockErrorMessage(baseMessage: string, gitDir: string): string {
    const indexLockPath = cleanGitPath(path.join(gitDir, 'index.lock'));
    if (baseMessage.includes('.git/index.lock')) {
        return baseMessage.replace('.git/index.lock', indexLockPath);
    }
    return `${baseMessage} (${indexLockPath})`;
}
