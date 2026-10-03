/**
 * Host-only: collectDiff shows VS Code prompts and messages.
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import type * as vscode from 'vscode';
import type { Logger } from '../../infrastructure/logging/Logger';
import { collectDiff } from '../../services/git.diff';
import { removeTempDirectory } from '../../test/helpers/temp-directory.helper';

const logger = {
    debug: () => undefined,
    info: () => undefined,
    warning: () => undefined,
    error: () => undefined,
} as unknown as Logger;

/** "Always stage" is on, so no prompt appears while nothing is untracked */
const alwaysStage = {
    get: () => true,
    update: async () => undefined,
    keys: () => [],
} as unknown as vscode.Memento;

function collect(git: SimpleGit) {
    return collectDiff(git, logger, alwaysStage, () => false, 0, 'index.lock');
}

suite('collectDiff staging rollback (G1)', () => {
    let dir: string;
    let git: SimpleGit;

    async function statusLines(): Promise<string[]> {
        return (await git.status()).files.map((f) => `${f.index}${f.working_dir} ${f.path}`).sort();
    }

    setup(async () => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otak-collect-'));
        git = simpleGit(dir);
        await git.init();
        await git.addConfig('user.name', 'test');
        await git.addConfig('user.email', 'test@example.invalid');
        await git.addConfig('core.autocrlf', 'false');
        await git.addConfig('commit.gpgsign', 'false');
        fs.writeFileSync(path.join(dir, 'tracked.ts'), 'one\n');
        fs.writeFileSync(path.join(dir, 'other.ts'), 'one\n');
        await git.add(['-A']);
        await git.commit('init');
        fs.writeFileSync(path.join(dir, 'tracked.ts'), 'two\n');
    });

    teardown(() => {
        removeTempDirectory(dir);
    });

    test('reports what the extension staged with the diff', async () => {
        const collected = await collect(git);

        assert.ok(collected?.diff.includes('+two'));
        assert.deepStrictEqual(collected?.stagedByExtension, ['tracked.ts']);
        assert.deepStrictEqual(await statusLines(), ['M  tracked.ts']);
    });

    test('reports nothing to undo when the user had staged changes', async () => {
        fs.writeFileSync(path.join(dir, 'other.ts'), 'two\n');
        await git.add('other.ts');

        const collected = await collect(git);

        assert.deepStrictEqual(collected?.stagedByExtension, []);
        assert.deepStrictEqual(await statusLines(), [' M tracked.ts', 'M  other.ts']);
    });

    test('undoes its staging when reading the diff fails', async () => {
        const failingDiff = new Proxy(git, {
            get(target, property) {
                if (property === 'diff') {
                    return async () => {
                        throw new Error('diff failed');
                    };
                }
                const value = Reflect.get(target, property);
                return typeof value === 'function' ? value.bind(target) : value;
            },
        });

        await assert.rejects(collect(failingDiff), /diff failed/);

        assert.deepStrictEqual(await statusLines(), [' M tracked.ts']);
    });
});
