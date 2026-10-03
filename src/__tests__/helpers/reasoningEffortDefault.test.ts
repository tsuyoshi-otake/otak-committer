/**
 * The reasoning-effort fallback used in code must be the manifest default, so an
 * unset or unreadable setting behaves exactly like the documented default.
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_REASONING_EFFORT } from '../../types/enums/ReasoningEffort';

suite('Reasoning effort default', () => {
    const repoRoot = path.resolve(__dirname, '../../..');
    const readJson = (name: string) =>
        JSON.parse(fs.readFileSync(path.join(repoRoot, name), 'utf8'));

    test('code fallback equals the package.json default', () => {
        const setting =
            readJson('package.json').contributes.configuration.properties[
                'otakCommitter.reasoningEffort'
            ];

        assert.strictEqual(setting.default, DEFAULT_REASONING_EFFORT);
    });

    test('the English description does not recommend a non-default level', () => {
        const nls = readJson('package.nls.json');

        for (const level of ['none', 'low', 'medium', 'high'].filter(
            (candidate) => candidate !== DEFAULT_REASONING_EFFORT,
        )) {
            const description: string = nls[`config.reasoningEffort.${level}`];
            assert.ok(!/recommended/i.test(description), `${level}: ${description}`);
        }
    });
});
