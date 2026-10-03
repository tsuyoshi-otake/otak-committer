import * as assert from 'assert';
import { GitApiRepository, selectTargetRepository } from '../../services/git.repository';
import { setCommitMessageInSourceControl } from '../commitMessageInput';

function repository(fsPath: string, selected = false): GitApiRepository {
    return {
        rootUri: { fsPath },
        inputBox: { value: '' },
        state: {},
        ui: { selected },
        getConfig: async () => undefined,
    };
}

const silentLogger = { debug: () => undefined, error: () => undefined };

suite('setCommitMessageInSourceControl', () => {
    test('writes the message into the resolved repository only', () => {
        const api = repository('C:/work/api');
        const web = repository('C:/work/web', true);
        const target = selectTargetRepository([web, api], 'C:/work/api', undefined);

        setCommitMessageInSourceControl(
            'feat: api change',
            { repository: target, gitExtensionAvailable: true },
            silentLogger,
        );

        assert.strictEqual(api.inputBox?.value, 'feat: api change');
        assert.strictEqual(web.inputBox?.value, '');
    });

    test('fails instead of writing when the target repository is unknown', () => {
        assert.throws(() =>
            setCommitMessageInSourceControl(
                'feat: x',
                { repository: undefined, gitExtensionAvailable: true },
                silentLogger,
            ),
        );
        assert.throws(() =>
            setCommitMessageInSourceControl(
                'feat: x',
                { repository: undefined, gitExtensionAvailable: false },
                silentLogger,
            ),
        );
    });
});
