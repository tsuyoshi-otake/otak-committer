import * as assert from 'assert';
import {
    GitApiRepository,
    getSourceControlRootPath,
    selectTargetRepository,
} from '../git.repository';

function repository(fsPath: string, selected = false): GitApiRepository {
    return {
        rootUri: { fsPath },
        inputBox: { value: '' },
        state: {},
        ui: { selected },
        getConfig: async () => undefined,
    };
}

suite('Commit target repository (multi-root)', () => {
    test('reads the root of the SourceControl passed by scm/title', () => {
        assert.strictEqual(
            getSourceControlRootPath({ id: 'git', rootUri: { fsPath: 'C:/work/api' } }),
            'C:/work/api',
        );
    });

    test('treats a command-palette call (no argument) as no preferred root', () => {
        for (const arg of [
            undefined,
            null,
            {},
            { rootUri: undefined },
            { rootUri: { fsPath: '' } },
            'C:/x',
        ]) {
            assert.strictEqual(getSourceControlRootPath(arg), undefined, JSON.stringify(arg));
        }
    });

    test('the clicked repository wins over the SCM view selection', () => {
        const api = repository('C:/work/api');
        const web = repository('C:/work/web', true);

        const target = selectTargetRepository([web, api], 'C:/work/api', 'C:/work/web');

        assert.strictEqual(target, api);
    });

    test('falls back to the selection/workspace rule when no root is named', () => {
        const api = repository('C:/work/api');
        const web = repository('C:/work/web', true);

        assert.strictEqual(selectTargetRepository([api, web], undefined, 'C:/work/api'), web);
    });

    test('falls back when the named root is not a known repository', () => {
        const api = repository('C:/work/api');

        assert.strictEqual(selectTargetRepository([api], 'C:/elsewhere', 'C:/work/api'), api);
    });
});
