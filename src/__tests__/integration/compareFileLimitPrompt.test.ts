/**
 * Host-only: prPrompt loads VS Code configuration through promptConfig.
 */
import * as assert from 'assert';
import { generateDiffSummaryContent } from '../../services/prPrompt';
import type { PullRequestDiff } from '../../types';

function diffWith(fileLimitReached?: boolean): PullRequestDiff {
    return {
        files: [{ filename: 'a.ts', additions: 1, deletions: 0, patch: '+a' }],
        stats: { additions: 1, deletions: 0 },
        ...(fileLimitReached ? { fileLimitReached } : {}),
    };
}

suite('PR prompt: GitHub compare file cap', () => {
    test('tells the model that further changed files exist when the cap was reached', () => {
        assert.match(
            generateDiffSummaryContent(diffWith(true)),
            /Note: GitHub listed only the first 1 changed files; further changed files exist/,
        );
    });

    test('adds no note below the cap', () => {
        assert.doesNotMatch(generateDiffSummaryContent(diffWith()), /GitHub listed only/);
    });
});
