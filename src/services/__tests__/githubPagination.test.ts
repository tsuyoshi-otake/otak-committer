import * as assert from 'assert';
import type { Logger } from '../../infrastructure/logging/Logger';
import type { GitHubAPI } from '../../types';
import { getBranches } from '../github.branches';
import { getBranchDiffDetails } from '../github.diff';
import { getIssues } from '../github.issues';
import { GITHUB_COMPARE_FILE_LIMIT, collectPages } from '../github.pagination';

function createLogger() {
    const warnings: string[] = [];
    const logger = {
        debug: () => undefined,
        info: () => undefined,
        warning: (message: string) => warnings.push(message),
        error: () => undefined,
    } as unknown as Logger;
    return { logger, warnings };
}

function pageOf<T>(all: T[], page = 1, perPage = 100): T[] {
    return all.slice((page - 1) * perPage, page * perPage);
}

function fakeOctokit(overrides: {
    branches?: string[];
    issues?: Array<{ number: number; pull_request?: object }>;
    compareFiles?: number;
}): { octokit: GitHubAPI; pages: number[] } {
    const pages: number[] = [];
    const octokit = {
        repos: {
            listBranches: async ({ page, per_page }: { page?: number; per_page?: number }) => {
                pages.push(page ?? 1);
                return {
                    status: 200,
                    data: pageOf(overrides.branches ?? [], page, per_page).map((name) => ({
                        name,
                    })),
                };
            },
            compareCommits: async () => ({
                status: 200,
                data: {
                    files: Array.from({ length: overrides.compareFiles ?? 0 }, (_, i) => ({
                        filename: `f${i}.ts`,
                        additions: 1,
                        deletions: 0,
                        patch: '+x',
                    })),
                },
            }),
        },
        issues: {
            listForRepo: async ({ page, per_page }: { page?: number; per_page?: number }) => {
                pages.push(page ?? 1);
                return {
                    status: 200,
                    data: pageOf(overrides.issues ?? [], page, per_page).map((item) => ({
                        ...item,
                        title: `#${item.number}`,
                        body: '',
                        labels: [],
                    })),
                };
            },
        },
    } as unknown as GitHubAPI;
    return { octokit, pages };
}

suite('GitHub list pagination and compare file cap', () => {
    test('collectPages stops at the first short page', async () => {
        const requested: number[] = [];
        const result = await collectPages(
            async (page) => {
                requested.push(page);
                return page < 3 ? [1, 2] : [3];
            },
            2,
            10,
        );

        assert.deepStrictEqual(result, { items: [1, 2, 1, 2, 3], truncated: false });
        assert.deepStrictEqual(requested, [1, 2, 3]);
    });

    test('collectPages stops at the page limit and reports truncation', async () => {
        let calls = 0;
        const result = await collectPages(
            async () => {
                calls++;
                return [0, 0];
            },
            2,
            3,
        );

        assert.strictEqual(calls, 3);
        assert.strictEqual(result.items.length, 6);
        assert.strictEqual(result.truncated, true);
    });

    test('collectPages propagates a failing page', async () => {
        await assert.rejects(
            collectPages(async (page) => {
                if (page === 2) {
                    throw new Error('rate limited');
                }
                return [1];
            }, 1),
            /rate limited/,
        );
    });

    test('getBranches returns branches beyond the first 100', async () => {
        const names = Array.from({ length: 250 }, (_, i) => `branch-${i}`);
        const { octokit, pages } = fakeOctokit({ branches: names });
        const { logger, warnings } = createLogger();

        const branches = await getBranches(octokit, 'o', 'r', 100, logger);

        assert.strictEqual(branches.length, 250);
        assert.strictEqual(branches[249], 'branch-249');
        assert.deepStrictEqual(pages, [1, 2, 3]);
        assert.deepStrictEqual(warnings, []);
    });

    test('getIssues pages through results and drops pull requests', async () => {
        const items = Array.from({ length: 150 }, (_, i) => ({
            number: i + 1,
            ...(i % 2 === 0 ? { pull_request: {} } : {}),
        }));
        const { octokit, pages } = fakeOctokit({ issues: items });
        const { logger } = createLogger();

        const issues = await getIssues(octokit, 'o', 'r', 100, logger);

        assert.deepStrictEqual(pages, [1, 2]);
        assert.strictEqual(issues.length, 75);
        assert.ok(issues.every((issue) => issue.number % 2 === 0));
    });

    test(`compare at GitHub's ${GITHUB_COMPARE_FILE_LIMIT}-file cap is flagged and warned`, async () => {
        const { octokit } = fakeOctokit({ compareFiles: GITHUB_COMPARE_FILE_LIMIT });
        const { logger, warnings } = createLogger();

        const diff = await getBranchDiffDetails(octokit, 'o', 'r', 'main', 'feature', logger);

        assert.strictEqual(diff.fileLimitReached, true);
        assert.strictEqual(warnings.length, 1);
    });

    test('compare below the cap is not flagged', async () => {
        const { octokit } = fakeOctokit({ compareFiles: GITHUB_COMPARE_FILE_LIMIT - 1 });
        const { logger, warnings } = createLogger();

        const diff = await getBranchDiffDetails(octokit, 'o', 'r', 'main', 'feature', logger);

        assert.strictEqual(diff.fileLimitReached, undefined);
        assert.deepStrictEqual(warnings, []);
    });
});
