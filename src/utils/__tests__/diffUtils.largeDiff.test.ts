import { suite, test } from 'mocha';
import * as assert from 'assert';
import {
    parseDiffIntoFiles,
    buildChangeSummaryHeader,
    assemblePrioritizedDiff,
    FilePriority,
} from '../diffUtils';

/**
 * Helper to create a synthetic git diff for a single file
 */
function makeDiff(filePath: string, additions: number, deletions: number): string {
    const addLines = Array.from({ length: additions }, (_, i) => `+added line ${i}`).join('\n');
    const delLines = Array.from({ length: deletions }, (_, i) => `-removed line ${i}`).join('\n');
    return `diff --git a/${filePath} b/${filePath}
index abc1234..def5678 100644
--- a/${filePath}
+++ b/${filePath}
@@ -1,${deletions} +1,${additions} @@
${delLines}
${addLines}
`;
}

/**
 * Helper to create a multi-file diff
 */
function makeMultiFileDiff(
    files: Array<{ path: string; additions: number; deletions: number }>,
): string {
    return files.map((f) => makeDiff(f.path, f.additions, f.deletions)).join('');
}

suite('diffUtils - Large Diff Processing', () => {
    suite('parseDiffIntoFiles', () => {
        test('should return empty array for empty input', () => {
            assert.deepStrictEqual(parseDiffIntoFiles(''), []);
            assert.deepStrictEqual(parseDiffIntoFiles('  '), []);
        });

        test('should return empty array for non-diff content', () => {
            assert.deepStrictEqual(parseDiffIntoFiles('just some text\nwith no diff headers'), []);
        });

        test('should parse a single file diff', () => {
            const diff = makeDiff('src/index.ts', 5, 3);
            const result = parseDiffIntoFiles(diff);

            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].filePath, 'src/index.ts');
            assert.strictEqual(result[0].additions, 5);
            assert.strictEqual(result[0].deletions, 3);
            assert.strictEqual(result[0].priority, FilePriority.HIGH);
            assert.ok(result[0].tokenCount > 0);
        });

        test('should parse multiple file diffs', () => {
            const diff = makeMultiFileDiff([
                { path: 'src/a.ts', additions: 10, deletions: 2 },
                { path: 'src/b.ts', additions: 5, deletions: 0 },
                { path: 'package-lock.json', additions: 100, deletions: 50 },
            ]);
            const result = parseDiffIntoFiles(diff);

            assert.strictEqual(result.length, 3);
            assert.strictEqual(result[0].filePath, 'src/a.ts');
            assert.strictEqual(result[1].filePath, 'src/b.ts');
            assert.strictEqual(result[2].filePath, 'package-lock.json');
        });

        test('should classify lock files as EXCLUDE', () => {
            const diff = makeDiff('package-lock.json', 100, 50);
            const result = parseDiffIntoFiles(diff);

            assert.strictEqual(result[0].priority, FilePriority.EXCLUDE);
        });

        test('should classify generated files as LOW', () => {
            const diff = makeDiff('dist/bundle.min.js', 200, 100);
            const result = parseDiffIntoFiles(diff);

            assert.strictEqual(result[0].priority, FilePriority.LOW);
        });

        test('should classify source files as HIGH', () => {
            const diff = makeDiff('src/services/git.ts', 10, 5);
            const result = parseDiffIntoFiles(diff);

            assert.strictEqual(result[0].priority, FilePriority.HIGH);
        });
    });

    suite('buildChangeSummaryHeader', () => {
        test('should include file count and totals', () => {
            const files = parseDiffIntoFiles(
                makeMultiFileDiff([
                    { path: 'src/a.ts', additions: 10, deletions: 2 },
                    { path: 'src/b.ts', additions: 5, deletions: 3 },
                ]),
            );
            const header = buildChangeSummaryHeader(files);

            assert.ok(header.includes('2 files'));
            assert.ok(header.includes('+15/-5'));
        });

        test('should list all files', () => {
            const files = parseDiffIntoFiles(
                makeMultiFileDiff([
                    { path: 'src/a.ts', additions: 10, deletions: 0 },
                    { path: 'package-lock.json', additions: 500, deletions: 300 },
                ]),
            );
            const header = buildChangeSummaryHeader(files);

            assert.ok(header.includes('src/a.ts'));
            assert.ok(header.includes('package-lock.json'));
        });

        test('should label lock files', () => {
            const files = parseDiffIntoFiles(makeDiff('yarn.lock', 100, 50));
            const header = buildChangeSummaryHeader(files);

            assert.ok(header.includes('[LOCK]'));
        });

        test('should label generated files', () => {
            const files = parseDiffIntoFiles(makeDiff('dist/bundle.min.js', 50, 20));
            const header = buildChangeSummaryHeader(files);

            assert.ok(header.includes('[generated]'));
        });
    });

    suite('assemblePrioritizedDiff', () => {
        test('should include all files when budget is sufficient', () => {
            const diff = makeMultiFileDiff([
                { path: 'src/a.ts', additions: 5, deletions: 2 },
                { path: 'src/b.ts', additions: 3, deletions: 1 },
            ]);
            const files = parseDiffIntoFiles(diff);
            const header = buildChangeSummaryHeader(files);
            const result = assemblePrioritizedDiff(files, header, 100000);

            assert.strictEqual(result.includedCount, 2);
            assert.strictEqual(result.summaryOnlyCount, 0);
            assert.strictEqual(result.overflowFiles.length, 0);
            assert.ok(result.content.includes('src/a.ts'));
            assert.ok(result.content.includes('src/b.ts'));
        });

        test('should exclude lock file diffs but include in summary', () => {
            const diff = makeMultiFileDiff([
                { path: 'src/a.ts', additions: 5, deletions: 2 },
                { path: 'package-lock.json', additions: 500, deletions: 300 },
            ]);
            const files = parseDiffIntoFiles(diff);
            const header = buildChangeSummaryHeader(files);
            const result = assemblePrioritizedDiff(files, header, 100000);

            assert.strictEqual(result.includedCount, 1);
            assert.strictEqual(result.summaryOnlyCount, 1);
            // Summary should mention the lock file
            assert.ok(result.content.includes('package-lock.json'));
            // The lock file diff header should NOT appear in the assembled output
            assert.ok(!result.content.includes('diff --git a/package-lock.json'));
        });

        test('should prioritize HIGH files over LOW files', () => {
            const diff = makeMultiFileDiff([
                { path: 'dist/bundle.min.js', additions: 100, deletions: 50 },
                { path: 'src/important.ts', additions: 5, deletions: 2 },
            ]);
            const files = parseDiffIntoFiles(diff);
            const header = buildChangeSummaryHeader(files);

            // Budget just enough for header + one file
            const headerTokens = Math.ceil(header.length / 4);
            const importantFileTokens = files.find(
                (f) => f.filePath === 'src/important.ts',
            )!.tokenCount;
            const tightBudget = headerTokens + importantFileTokens + 10;

            const result = assemblePrioritizedDiff(files, header, tightBudget);

            assert.strictEqual(result.includedCount, 1);
            // The important source file should be included, not the dist file
            assert.ok(result.content.includes('src/important.ts'));
        });

        test('should handle empty file list', () => {
            const result = assemblePrioritizedDiff([], '', 100000);

            assert.strictEqual(result.includedCount, 0);
            assert.strictEqual(result.summaryOnlyCount, 0);
            assert.strictEqual(result.content, '');
        });

        test('should track overflow files', () => {
            const diff = makeMultiFileDiff([
                { path: 'src/a.ts', additions: 5, deletions: 2 },
                { path: 'src/b.ts', additions: 5, deletions: 2 },
            ]);
            const files = parseDiffIntoFiles(diff);
            const header = buildChangeSummaryHeader(files);

            // Very tight budget: only enough for header + one file
            const headerTokens = Math.ceil(header.length / 4);
            const firstFileTokens = files[0].tokenCount;
            const tightBudget = headerTokens + firstFileTokens + 1;

            const result = assemblePrioritizedDiff(files, header, tightBudget);

            assert.strictEqual(result.includedCount, 1);
            assert.strictEqual(result.overflowFiles.length, 1);
        });
    });
});
