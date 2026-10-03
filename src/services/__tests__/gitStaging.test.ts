import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import {
    chooseStagingMode,
    classifyWorkingTreeChanges,
    listStagedPaths,
    stageChanges,
    StageChangesOptions,
    StagingMode,
    StagingPrompts,
    summarizePaths,
    undoStagingUnlessApplied,
    unstagePaths,
    WorkingTreeChanges,
} from '../git.staging';
import { removeTempDirectory } from '../../test/helpers/temp-directory.helper';
import { restartLatest } from '../../utils/restartLatest';

const quietLogger = {
    info: () => undefined,
    warning: () => undefined,
    error: () => undefined,
};

function scriptedPrompts(
    confirm: 'stage' | 'always' | undefined,
    untracked: StagingMode | undefined,
): StagingPrompts & { calls: string[] } {
    const calls: string[] = [];
    return {
        calls,
        confirmStageTracked: async () => {
            calls.push('confirm');
            return confirm;
        },
        chooseUntrackedHandling: async (files, hasTracked) => {
            calls.push(`untracked:${files.join(',')}:${hasTracked}`);
            return untracked;
        },
    };
}

function stagingOptions(
    mode: StagingMode,
    changes: WorkingTreeChanges,
    overrides: Partial<StageChangesOptions> = {},
): StageChangesOptions {
    return {
        mode,
        changes,
        reservedNameFiles: [],
        isWindowsReservedName: () => false,
        indexLockRetryDelayMs: 0,
        onIndexLockFailure: () => undefined,
        logger: quietLogger,
        ...overrides,
    };
}

suite('Git staging (G1)', () => {
    suite('chooseStagingMode', () => {
        const trackedOnly: WorkingTreeChanges = { tracked: ['a.ts'], untracked: [] };
        const withUntracked: WorkingTreeChanges = { tracked: ['a.ts'], untracked: ['.env'] };

        test('"always stage" stages tracked changes without asking when nothing is untracked', async () => {
            const prompts = scriptedPrompts(undefined, undefined);

            const mode = await chooseStagingMode(
                trackedOnly,
                true,
                prompts,
                async () => undefined,
                quietLogger,
            );

            assert.strictEqual(mode, 'tracked');
            assert.deepStrictEqual(prompts.calls, []);
        });

        test('"always stage" still asks about untracked files, every time', async () => {
            for (const answer of ['all', 'tracked', undefined] as const) {
                const prompts = scriptedPrompts('stage', answer);

                const mode = await chooseStagingMode(
                    withUntracked,
                    true,
                    prompts,
                    async () => undefined,
                    quietLogger,
                );

                assert.strictEqual(mode, answer);
                assert.deepStrictEqual(prompts.calls, ['untracked:.env:true']);
            }
        });

        test('without "always stage" the confirm prompt decides, and "always" is remembered', async () => {
            let remembered = 0;
            const remember = async () => {
                remembered++;
            };

            assert.strictEqual(
                await chooseStagingMode(
                    trackedOnly,
                    false,
                    scriptedPrompts('stage', undefined),
                    remember,
                    quietLogger,
                ),
                'tracked',
            );
            assert.strictEqual(remembered, 0);
            assert.strictEqual(
                await chooseStagingMode(
                    trackedOnly,
                    false,
                    scriptedPrompts('always', undefined),
                    remember,
                    quietLogger,
                ),
                'tracked',
            );
            assert.strictEqual(remembered, 1);
            assert.strictEqual(
                await chooseStagingMode(
                    trackedOnly,
                    false,
                    scriptedPrompts(undefined, undefined),
                    remember,
                    quietLogger,
                ),
                undefined,
            );
        });

        test('"tracked only" is not accepted when only untracked files changed', async () => {
            const prompts = scriptedPrompts('stage', 'tracked');

            const mode = await chooseStagingMode(
                { tracked: [], untracked: ['new.ts'] },
                true,
                prompts,
                async () => undefined,
                quietLogger,
            );

            assert.strictEqual(mode, undefined);
            assert.deepStrictEqual(prompts.calls, ['untracked:new.ts:false']);
        });
    });

    test('classifyWorkingTreeChanges splits tracked from untracked and drops ignored entries', () => {
        const changes = classifyWorkingTreeChanges([
            { path: 'mod.ts', index: ' ', working_dir: 'M' },
            { path: 'del.ts', index: ' ', working_dir: 'D' },
            { path: '.env', index: '?', working_dir: '?' },
            { path: 'dist/x.js', index: '!', working_dir: '!' },
        ]);

        assert.deepStrictEqual(changes, { tracked: ['mod.ts', 'del.ts'], untracked: ['.env'] });
    });

    test('listStagedPaths includes both sides of a rename', () => {
        const paths = listStagedPaths([
            { path: 'new.ts', from: 'old.ts', index: 'R', working_dir: ' ' },
            { path: 'a.ts', index: 'M', working_dir: 'M' },
            { path: 'b.ts', index: ' ', working_dir: 'M' },
            { path: '.env', index: '?', working_dir: '?' },
        ]);

        assert.deepStrictEqual(paths, ['old.ts', 'new.ts', 'a.ts']);
    });

    test('summarizePaths lists at most five names', () => {
        assert.strictEqual(summarizePaths(['a', 'b']), 'a, b');
        assert.strictEqual(
            summarizePaths(['1', '2', '3', '4', '5', '6', '7']),
            '1, 2, 3, 4, 5, …(+2)',
        );
    });

    test('per-file fallback in tracked mode never stages untracked files', async () => {
        const added: string[] = [];
        const git = {
            add: async (files: string | string[]) => {
                if (Array.isArray(files)) {
                    throw new Error('fatal: some other failure');
                }
                added.push(files);
            },
        } as unknown as SimpleGit;

        await stageChanges(
            git,
            stagingOptions(
                'tracked',
                { tracked: ['a.ts', 'nul'], untracked: ['.env'] },
                {
                    reservedNameFiles: ['nul'],
                    isWindowsReservedName: (file) => file === 'nul',
                },
            ),
        );

        assert.deepStrictEqual(added, ['a.ts']);
    });

    suite('undoStagingUnlessApplied', () => {
        function recorder(fail = false) {
            const unstaged: string[][] = [];
            const errors: string[] = [];
            return {
                unstaged,
                errors,
                unstage: async (paths: readonly string[]) => {
                    unstaged.push([...paths]);
                    if (fail) {
                        throw new Error('index locked');
                    }
                },
                logger: { error: (message: string) => errors.push(message) },
            };
        }

        test('keeps the staging when the message was applied', async () => {
            const r = recorder();

            assert.strictEqual(
                await undoStagingUnlessApplied(['a.ts'], r.unstage, r.logger, async () => true),
                true,
            );
            assert.deepStrictEqual(r.unstaged, []);
        });

        test('unstages when the run is cancelled or declined', async () => {
            const r = recorder();

            assert.strictEqual(
                await undoStagingUnlessApplied(
                    ['a.ts', '.env'],
                    r.unstage,
                    r.logger,
                    async () => false,
                ),
                false,
            );
            assert.deepStrictEqual(r.unstaged, [['a.ts', '.env']]);
        });

        test('unstages on failure and rethrows the original error, even if unstaging fails', async () => {
            const r = recorder(true);

            await assert.rejects(
                undoStagingUnlessApplied(['a.ts'], r.unstage, r.logger, async () => {
                    throw new Error('aborted');
                }),
                /aborted/,
            );
            assert.deepStrictEqual(r.unstaged, [['a.ts']]);
            assert.strictEqual(r.errors.length, 1);
        });

        test('touches nothing when the user had staged changes themselves', async () => {
            const r = recorder();

            await undoStagingUnlessApplied([], r.unstage, r.logger, async () => false);

            assert.deepStrictEqual(r.unstaged, []);
        });
    });

    test('unstagePaths batches long path lists and uses literal pathspecs', async () => {
        const calls: string[][] = [];
        const git = {
            raw: async (args: string[]) => {
                calls.push(args);
                return '';
            },
        } as unknown as SimpleGit;
        const paths = Array.from({ length: 300 }, (_, i) => `src/${'d'.repeat(60)}/file-${i}.ts`);

        await unstagePaths(git, paths);

        assert.ok(calls.length > 1);
        for (const args of calls) {
            assert.deepStrictEqual(args.slice(0, 4), ['--literal-pathspecs', 'reset', '-q', '--']);
            assert.ok(args.slice(4).join(' ').length <= 8000);
        }
        assert.deepStrictEqual(
            calls.flatMap((args) => args.slice(4)),
            paths,
        );
    });

    suite('against a real repository', () => {
        let dir: string;
        let git: SimpleGit;

        async function statusLines(): Promise<string[]> {
            return (await git.status()).files
                .map((f) => `${f.index}${f.working_dir} ${f.path}`)
                .sort();
        }

        setup(async () => {
            dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otak-staging-'));
            git = simpleGit(dir);
            await git.init();
            await git.addConfig('user.name', 'test');
            await git.addConfig('user.email', 'test@example.invalid');
            await git.addConfig('core.autocrlf', 'false');
            await git.addConfig('commit.gpgsign', 'false');
            fs.writeFileSync(path.join(dir, 'tracked.ts'), 'one\n');
            fs.writeFileSync(path.join(dir, 'gone.ts'), 'bye\n');
            await git.add(['-A']);
            await git.commit('init');
            fs.writeFileSync(path.join(dir, 'tracked.ts'), 'two\n');
            fs.unlinkSync(path.join(dir, 'gone.ts'));
            fs.writeFileSync(path.join(dir, '.env'), 'SECRET=1\n');
        });

        teardown(() => {
            removeTempDirectory(dir);
        });

        test('tracked mode stages modifications and deletions but leaves .env untracked', async () => {
            const changes = classifyWorkingTreeChanges((await git.status()).files);

            await stageChanges(git, stagingOptions('tracked', changes));

            assert.deepStrictEqual(await statusLines(), ['?? .env', 'D  gone.ts', 'M  tracked.ts']);
        });

        test('all mode stages the untracked file too', async () => {
            const changes = classifyWorkingTreeChanges((await git.status()).files);

            await stageChanges(git, stagingOptions('all', changes));

            assert.deepStrictEqual(await statusLines(), ['A  .env', 'D  gone.ts', 'M  tracked.ts']);
        });

        test('unstaging what was staged restores the previous status exactly', async () => {
            const before = await statusLines();
            const changes = classifyWorkingTreeChanges((await git.status()).files);
            await stageChanges(git, stagingOptions('all', changes));

            await unstagePaths(git, listStagedPaths((await git.status()).files));

            assert.deepStrictEqual(await statusLines(), before);
        });

        test('a restarted run reads the index only after the aborted run has unstaged', async () => {
            const before = await statusLines();
            const seenByNextRun: string[][] = [];
            let markStaged!: () => void;
            const staged = new Promise<void>((resolve) => {
                markStaged = resolve;
            });
            const run = restartLatest(async (signal: AbortSignal, name: string) => {
                if (name !== 'first') {
                    seenByNextRun.push(listStagedPaths((await git.status()).files));
                    return;
                }
                const changes = classifyWorkingTreeChanges((await git.status()).files);
                await stageChanges(git, stagingOptions('tracked', changes));
                await undoStagingUnlessApplied(
                    listStagedPaths((await git.status()).files),
                    (paths) => unstagePaths(git, paths),
                    quietLogger,
                    async () => {
                        markStaged();
                        await new Promise<never>((_, reject) => {
                            signal.addEventListener('abort', () => reject(new Error('aborted')));
                        });
                        return true;
                    },
                );
            });

            const first = run('first');
            await staged;
            const second = run('second');
            await assert.rejects(first, /aborted/);
            await second;

            assert.deepStrictEqual(seenByNextRun, [[]]);
            assert.deepStrictEqual(await statusLines(), before);
        });

        test('unstaging a glob-like name leaves the file it would match staged', async () => {
            fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
            fs.writeFileSync(path.join(dir, '[a].txt'), 'b\n');
            await git.add(['a.txt', '[a].txt']);

            await unstagePaths(git, ['[a].txt']);

            const lines = await statusLines();
            assert.ok(lines.includes('A  a.txt'), lines.join('\n'));
            assert.ok(lines.includes('?? [a].txt'), lines.join('\n'));
        });

        test('unstaging works on a branch without commits', async () => {
            const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'otak-unborn-'));
            try {
                const unborn = simpleGit(fresh);
                await unborn.init();
                fs.writeFileSync(path.join(fresh, 'first.ts'), 'x\n');
                await unborn.add(['-A']);

                await unstagePaths(unborn, listStagedPaths((await unborn.status()).files));

                assert.deepStrictEqual(
                    (await unborn.status()).files.map(
                        (f) => `${f.index}${f.working_dir} ${f.path}`,
                    ),
                    ['?? first.ts'],
                );
            } finally {
                removeTempDirectory(fresh);
            }
        });
    });
});
