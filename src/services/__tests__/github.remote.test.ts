import * as assert from 'assert';
import { parseGitHubRemoteUrl } from '../github.remote';

suite('GitHub remote URL parsing', () => {
    const cases: Array<[string, { owner: string; repo: string }]> = [
        ['https://github.com/octo-org/hello-world.git', { owner: 'octo-org', repo: 'hello-world' }],
        ['https://github.com/octo-org/hello-world', { owner: 'octo-org', repo: 'hello-world' }],
        ['https://github.com/octo-org/hello-world/', { owner: 'octo-org', repo: 'hello-world' }],
        ['git@github.com:octo-org/hello-world.git', { owner: 'octo-org', repo: 'hello-world' }],
        [
            'ssh://git@github.com/octo-org/hello-world.git',
            { owner: 'octo-org', repo: 'hello-world' },
        ],
        [
            'https://github.com/octo-org/octo-org.github.io.git',
            { owner: 'octo-org', repo: 'octo-org.github.io' },
        ],
        ['https://github.com/octo-org/next.js', { owner: 'octo-org', repo: 'next.js' }],
        ['git@github.com:octo-org/next.js.git', { owner: 'octo-org', repo: 'next.js' }],
    ];

    for (const [remoteUrl, expected] of cases) {
        test(`parses ${remoteUrl}`, () => {
            assert.deepStrictEqual(parseGitHubRemoteUrl(remoteUrl), expected);
        });
    }

    test('rejects remotes that are not a GitHub owner/repo pair', () => {
        for (const remoteUrl of [
            'https://gitlab.com/octo-org/hello-world.git',
            'https://github.com/octo-org',
            'https://github.com/octo-org/hello-world/tree/main',
        ]) {
            assert.strictEqual(parseGitHubRemoteUrl(remoteUrl), undefined, remoteUrl);
        }
    });
});
