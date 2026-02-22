import { suite, test } from 'mocha';
import * as assert from 'assert';
import { DiffProcessor, DiffTier } from '../diffProcessor';
import { TokenManager } from '../tokenManager';

/**
 * Helper to create a synthetic git diff for a single file
 */
function makeDiff(filePath: string, lineCount: number): string {
    const lines = Array.from({ length: lineCount }, (_, i) => `+line ${i}`).join('\n');
    return `diff --git a/${filePath} b/${filePath}
index abc1234..def5678 100644
--- a/${filePath}
+++ b/${filePath}
@@ -0,0 +1,${lineCount} @@
${lines}
`;
}

function makeMultiFileDiff(
    files: Array<{ path: string; lineCount: number }>,
): string {
    return files.map((f) => makeDiff(f.path, f.lineCount)).join('');
}

suite('DiffProcessor', () => {
    suite('Tier 1 - Normal', () => {
        test('should pass through small diffs unchanged', async () => {
            const processor = new DiffProcessor();
            const smallDiff = makeDiff('src/index.ts', 10);
            const result = await processor.process(smallDiff, 100000);

            assert.strictEqual(result.tier, DiffTier.Normal);
            assert.strictEqual(result.processedDiff, smallDiff);
        });

        test('should use Tier 1 when diff is within budget', async () => {
            const processor = new DiffProcessor();
            const diff = makeDiff('src/index.ts', 5);
            const budget = TokenManager.estimateTokens(diff) + 1000;
            const result = await processor.process(diff, budget);

            assert.strictEqual(result.tier, DiffTier.Normal);
        });
    });

    suite('Tier 2 - Smart Prioritization', () => {
        test('should apply Tier 2 when diff exceeds budget', async () => {
            const processor = new DiffProcessor();
            // Create a diff with a lock file and a source file
            const diff = makeMultiFileDiff([
                { path: 'src/index.ts', lineCount: 10 },
                { path: 'package-lock.json', lineCount: 500 },
            ]);
            // Budget smaller than total but enough for source file
            const sourceOnlyTokens = TokenManager.estimateTokens(makeDiff('src/index.ts', 10));
            const budget = sourceOnlyTokens + 500; // Enough for source + summary header
            const result = await processor.process(diff, budget);

            assert.strictEqual(result.tier, DiffTier.SmartPrioritized);
            assert.ok(result.processedDiff.includes('src/index.ts'));
            assert.ok(result.processedDiff.includes('package-lock.json')); // In summary
            assert.ok(result.totalFiles >= 2);
        });

        test('should exclude lock file diff content', async () => {
            const processor = new DiffProcessor();
            const diff = makeMultiFileDiff([
                { path: 'src/app.ts', lineCount: 5 },
                { path: 'yarn.lock', lineCount: 1000 },
            ]);
            const result = await processor.process(diff, 5000);

            assert.ok(result.processedDiff.includes('yarn.lock')); // In summary header
            assert.ok(result.processedDiff.includes('[LOCK]'));
            assert.ok(result.excludedFiles > 0);
        });

        test('should include change summary header', async () => {
            const processor = new DiffProcessor();
            const diff = makeMultiFileDiff([
                { path: 'src/a.ts', lineCount: 10 },
                { path: 'package-lock.json', lineCount: 500 },
            ]);
            const result = await processor.process(diff, 5000);

            assert.ok(result.processedDiff.includes('## Change Summary'));
        });
    });

    suite('Tier selection', () => {
        test('should not trigger Tier 3 without OpenAI service', async () => {
            const processor = new DiffProcessor(undefined);
            const diff = makeMultiFileDiff([
                { path: 'src/a.ts', lineCount: 100 },
                { path: 'src/b.ts', lineCount: 100 },
                { path: 'src/c.ts', lineCount: 100 },
            ]);
            // Very tight budget
            const result = await processor.process(diff, 200);

            // Should be Tier 2, not Tier 3 (no OpenAI service available)
            assert.ok(result.tier <= DiffTier.SmartPrioritized);
        });

        test('should handle empty diff gracefully', async () => {
            const processor = new DiffProcessor();
            const result = await processor.process('', 100000);

            assert.strictEqual(result.tier, DiffTier.Normal);
            assert.strictEqual(result.processedDiff, '');
        });

        test('should handle diff with no file headers', async () => {
            const processor = new DiffProcessor();
            const weirdDiff = 'some content without diff headers\nline2\nline3';
            // Make budget smaller than content
            const result = await processor.process(weirdDiff, 1);

            assert.strictEqual(result.tier, DiffTier.Normal);
        });
    });
});
