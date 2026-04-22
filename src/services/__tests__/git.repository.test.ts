import * as assert from 'assert';
import { SimpleGit } from 'simple-git';
import {
    buildIndexLockErrorMessage,
    resolveGitRepositoryContext,
    selectRepositoryForPath,
} from '../git.repository';

suite('Git Repository Helper Tests', () => {
    test('should replace index.lock path with resolved git dir path', () => {
        const message = buildIndexLockErrorMessage(
            'Git is busy. Delete .git/index.lock if the problem persists.',
            'C:/repo/.git/worktrees/feature',
        );

        assert.strictEqual(
            message,
            'Git is busy. Delete C:/repo/.git/worktrees/feature/index.lock if the problem persists.',
        );
    });

    test('should append resolved index.lock path when base message lacks placeholder', () => {
        const message = buildIndexLockErrorMessage(
            'Git is busy. Please wait.',
            'C:/repo/.git/worktrees/feature',
        );

        assert.strictEqual(
            message,
            'Git is busy. Please wait. (C:/repo/.git/worktrees/feature/index.lock)',
        );
    });

    test('should prefer the repository marked as selected in the SCM view', () => {
        const repositories = [
            {
                rootUri: { fsPath: 'C:/repo/smile-chat-main' },
                state: {},
                getConfig: async () => undefined,
            },
            {
                rootUri: { fsPath: 'C:/repo/smile-chat-develop' },
                state: {},
                ui: { selected: true },
                getConfig: async () => undefined,
            },
        ];

        const selectedRepository = selectRepositoryForPath(
            repositories,
            'C:/repo',
        );

        assert.strictEqual(
            selectedRepository?.rootUri?.fsPath,
            'C:/repo/smile-chat-develop',
        );
    });

    test('should still fall back to path matching when no repository is marked selected', () => {
        const repositories = [
            {
                rootUri: { fsPath: 'C:/repo/main' },
                state: {},
                ui: { selected: false },
                getConfig: async () => undefined,
            },
            {
                rootUri: { fsPath: 'C:/repo/feature' },
                state: {},
                ui: { selected: false },
                getConfig: async () => undefined,
            },
        ];

        const selectedRepository = selectRepositoryForPath(
            repositories,
            'C:/repo/feature/src/app.ts',
        );

        assert.strictEqual(
            selectedRepository?.rootUri?.fsPath,
            'C:/repo/feature',
        );
    });

    test('should prefer the deepest repository that contains the workspace path', () => {
        const repositories = [
            {
                rootUri: { fsPath: 'C:/repo' },
                state: {},
                getConfig: async () => undefined,
            },
            {
                rootUri: { fsPath: 'C:/repo/worktrees/feature' },
                state: {},
                getConfig: async () => undefined,
            },
        ];

        const selectedRepository = selectRepositoryForPath(
            repositories,
            'C:/repo/worktrees/feature/src',
        );

        assert.strictEqual(
            selectedRepository?.rootUri?.fsPath,
            'C:/repo/worktrees/feature',
        );
    });

    test('should return undefined when no repositories are registered', () => {
        const selectedRepository = selectRepositoryForPath([], 'C:/repo');
        assert.strictEqual(selectedRepository, undefined);
    });

    test('should fall back to the first repository when target path is not provided', () => {
        const repositories = [
            {
                rootUri: { fsPath: 'C:/repo/first' },
                state: {},
                getConfig: async () => undefined,
            },
            {
                rootUri: { fsPath: 'C:/repo/second' },
                state: {},
                getConfig: async () => undefined,
            },
        ];

        const selectedRepository = selectRepositoryForPath(repositories, undefined);

        assert.strictEqual(selectedRepository?.rootUri?.fsPath, 'C:/repo/first');
    });

    test('should resolve worktree repository context via --path-format=absolute when available', async () => {
        const calls: string[] = [];
        const git = {
            raw: async (args: string[]) => {
                const command = args.join(' ');
                calls.push(command);

                if (command === 'rev-parse --show-toplevel') {
                    return 'C:/repo/worktrees/feature\n';
                }

                if (command === 'rev-parse --absolute-git-dir') {
                    return 'C:/repo/.git/worktrees/feature\n';
                }

                if (command === 'rev-parse --path-format=absolute --git-common-dir') {
                    return 'C:/repo/.git\n';
                }

                throw new Error(`Unexpected git command: ${command}`);
            },
        } as unknown as SimpleGit;

        const repositoryContext = await resolveGitRepositoryContext(
            git,
            'C:/repo/worktrees/feature',
        );

        assert.deepStrictEqual(repositoryContext, {
            workspacePath: 'C:/repo/worktrees/feature',
            rootPath: 'C:/repo/worktrees/feature',
            gitDir: 'C:/repo/.git/worktrees/feature',
            commonDir: 'C:/repo/.git',
            isWorktree: true,
        });
        assert.ok(!calls.includes('rev-parse --git-common-dir'));
    });

    test('should resolve worktree repository context even when absolute path mode is unavailable', async () => {
        const calls: string[] = [];
        const git = {
            raw: async (args: string[]) => {
                const command = args.join(' ');
                calls.push(command);

                if (command === 'rev-parse --show-toplevel') {
                    return 'C:/repo/worktrees/feature\n';
                }

                if (command === 'rev-parse --absolute-git-dir') {
                    return 'C:/repo/.git/worktrees/feature\n';
                }

                if (command === 'rev-parse --path-format=absolute --git-common-dir') {
                    throw new Error('unknown option: --path-format');
                }

                if (command === 'rev-parse --git-common-dir') {
                    return '../../../.git\n';
                }

                throw new Error(`Unexpected git command: ${command}`);
            },
        } as unknown as SimpleGit;

        const repositoryContext = await resolveGitRepositoryContext(
            git,
            'C:/repo/worktrees/feature/src',
        );

        assert.deepStrictEqual(repositoryContext, {
            workspacePath: 'C:/repo/worktrees/feature/src',
            rootPath: 'C:/repo/worktrees/feature',
            gitDir: 'C:/repo/.git/worktrees/feature',
            commonDir: 'C:/repo/.git',
            isWorktree: true,
        });
        assert.ok(calls.includes('rev-parse --path-format=absolute --git-common-dir'));
        assert.ok(calls.includes('rev-parse --git-common-dir'));
    });

    test('should mark standard repositories as non-worktree when gitDir equals commonDir', async () => {
        const git = {
            raw: async (args: string[]) => {
                const command = args.join(' ');

                if (command === 'rev-parse --show-toplevel') {
                    return 'C:/repo\n';
                }

                if (command === 'rev-parse --absolute-git-dir') {
                    return 'C:/repo/.git\n';
                }

                if (command === 'rev-parse --path-format=absolute --git-common-dir') {
                    return 'C:/repo/.git\n';
                }

                throw new Error(`Unexpected git command: ${command}`);
            },
        } as unknown as SimpleGit;

        const repositoryContext = await resolveGitRepositoryContext(git, 'C:/repo');

        assert.strictEqual(repositoryContext.isWorktree, false);
        assert.strictEqual(repositoryContext.rootPath, 'C:/repo');
    });
});
