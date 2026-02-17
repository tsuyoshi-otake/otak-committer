/**
 * Unit tests for GitService robustness enhancements
 *
 * **Feature: commit-message-generation-robustness**
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2, 5.1, 5.2, 5.3, 5.4, 5.5**
 */

import * as assert from 'assert';
import {
    FileCategories,
    truncateDiff,
    categorizeFiles,
    isWindowsReservedName,
    generateFileSummary,
    estimateTokenCount,
} from '../../utils/diffUtils';

suite('GitService Robustness Tests', () => {
    suite('Diff Truncation', () => {
        /**
         * Test: Diff at exactly 200K tokens should not be truncated
         * Validates: Requirement 1.1
         */
        test('should not truncate diff at exactly 200K tokens', () => {
            // 200K tokens * 4 chars per token = 800K characters
            const tokenThreshold = 200 * 1000;
            const charCount = tokenThreshold * 4;
            const diff = 'a'.repeat(charCount);

            const result = truncateDiff(diff);

            assert.strictEqual(result.isTruncated, false);
            assert.strictEqual(result.content.length, charCount);
        });

        /**
         * Test: Diff at 201K tokens should be truncated
         * Validates: Requirement 1.1
         */
        test('should truncate diff exceeding 200K tokens', () => {
            const tokenThreshold = 201 * 1000;
            const charCount = tokenThreshold * 4;
            const diff = 'a'.repeat(charCount);

            const result = truncateDiff(diff);

            assert.strictEqual(result.isTruncated, true);
            assert.ok(result.content.length <= 200 * 1000 * 4);
            assert.ok(result.originalTokens! > result.truncatedTokens!);
        });

        /**
         * Test: Large truncation (500K tokens) should still preserve file headers
         * Validates: Requirement 1.1, Property 1
         */
        test('should preserve file headers during truncation', () => {
            // Create a diff with file headers
            const fileHeaders = [
                'diff --git a/file1.ts b/file1.ts',
                '--- a/file1.ts',
                '+++ b/file1.ts',
                '@@ -1,100 +1,100 @@',
            ].join('\n');

            const largeContent = 'a'.repeat(900000); // More than 200K tokens
            const diff = fileHeaders + '\n' + largeContent;

            const result = truncateDiff(diff);

            assert.strictEqual(result.isTruncated, true);
            // Should start with the file header
            assert.ok(result.content.startsWith('diff --git'));
        });
    });

    suite('Reserved Name Detection', () => {
        /**
         * Test: Should detect all Windows reserved names
         * Validates: Requirements 2.1, 2.2, Property 3
         */
        test('should detect CON as reserved name', () => {
            assert.strictEqual(isWindowsReservedName('CON'), true);
            assert.strictEqual(isWindowsReservedName('con'), true);
            assert.strictEqual(isWindowsReservedName('Con'), true);
        });

        test('should detect PRN as reserved name', () => {
            assert.strictEqual(isWindowsReservedName('PRN'), true);
            assert.strictEqual(isWindowsReservedName('prn'), true);
        });

        test('should detect AUX as reserved name', () => {
            assert.strictEqual(isWindowsReservedName('AUX'), true);
            assert.strictEqual(isWindowsReservedName('aux'), true);
        });

        test('should detect NUL as reserved name', () => {
            assert.strictEqual(isWindowsReservedName('NUL'), true);
            assert.strictEqual(isWindowsReservedName('nul'), true);
        });

        test('should detect COM1-9 as reserved names', () => {
            for (let i = 1; i <= 9; i++) {
                assert.strictEqual(isWindowsReservedName(`COM${i}`), true);
                assert.strictEqual(isWindowsReservedName(`com${i}`), true);
            }
        });

        test('should detect LPT1-9 as reserved names', () => {
            for (let i = 1; i <= 9; i++) {
                assert.strictEqual(isWindowsReservedName(`LPT${i}`), true);
                assert.strictEqual(isWindowsReservedName(`lpt${i}`), true);
            }
        });

        test('should detect reserved names with extensions', () => {
            assert.strictEqual(isWindowsReservedName('CON.txt'), true);
            assert.strictEqual(isWindowsReservedName('PRN.md'), true);
            assert.strictEqual(isWindowsReservedName('COM1.log'), true);
        });

        test('should detect reserved names in file paths', () => {
            assert.strictEqual(isWindowsReservedName('path/to/CON'), true);
            assert.strictEqual(isWindowsReservedName('path/to/CON.txt'), true);
        });

        test('should not flag normal file names', () => {
            assert.strictEqual(isWindowsReservedName('CONSOLE'), false);
            assert.strictEqual(isWindowsReservedName('CONTENT'), false);
            assert.strictEqual(isWindowsReservedName('myfile.txt'), false);
        });
    });

    suite('File Categorization', () => {
        /**
         * Test: Should categorize files by operation type
         * Validates: Requirement 1.2, Property 2
         */
        test('should categorize added files correctly', () => {
            const files = [{ path: 'new-file.ts', index: 'A', working_dir: ' ' }];

            const categories = categorizeFiles(files);

            assert.deepStrictEqual(categories.added, ['new-file.ts']);
            assert.deepStrictEqual(categories.modified, []);
            assert.deepStrictEqual(categories.deleted, []);
        });

        test('should categorize modified files correctly', () => {
            const files = [{ path: 'existing-file.ts', index: 'M', working_dir: ' ' }];

            const categories = categorizeFiles(files);

            assert.deepStrictEqual(categories.added, []);
            assert.deepStrictEqual(categories.modified, ['existing-file.ts']);
            assert.deepStrictEqual(categories.deleted, []);
        });

        test('should categorize deleted files correctly', () => {
            const files = [{ path: 'old-file.ts', index: 'D', working_dir: ' ' }];

            const categories = categorizeFiles(files);

            assert.deepStrictEqual(categories.added, []);
            assert.deepStrictEqual(categories.modified, []);
            assert.deepStrictEqual(categories.deleted, ['old-file.ts']);
        });

        test('should categorize renamed files correctly', () => {
            const files = [{ path: 'old-name.ts -> new-name.ts', index: 'R', working_dir: ' ' }];

            const categories = categorizeFiles(files);

            assert.strictEqual(categories.renamed.length, 1);
            assert.strictEqual(categories.renamed[0].from, 'old-name.ts');
            assert.strictEqual(categories.renamed[0].to, 'new-name.ts');
        });

        test('should categorize mixed operations correctly', () => {
            const files = [
                { path: 'added.ts', index: 'A', working_dir: ' ' },
                { path: 'modified.ts', index: 'M', working_dir: ' ' },
                { path: 'deleted.ts', index: 'D', working_dir: ' ' },
                { path: 'old.ts -> new.ts', index: 'R', working_dir: ' ' },
            ];

            const categories = categorizeFiles(files);

            assert.strictEqual(categories.added.length, 1);
            assert.strictEqual(categories.modified.length, 1);
            assert.strictEqual(categories.deleted.length, 1);
            assert.strictEqual(categories.renamed.length, 1);
        });

        test('should not duplicate files in categories', () => {
            const files = [
                { path: 'file1.ts', index: 'A', working_dir: ' ' },
                { path: 'file2.ts', index: 'M', working_dir: ' ' },
                { path: 'file3.ts', index: 'D', working_dir: ' ' },
            ];

            const categories = categorizeFiles(files);
            const totalCount =
                categories.added.length +
                categories.modified.length +
                categories.deleted.length +
                categories.renamed.length +
                categories.binary.length;

            assert.strictEqual(totalCount, files.length);
        });
    });

    suite('File Summary Generation', () => {
        /**
         * Test: Should generate summary for large changesets
         * Validates: Requirement 1.2
         */
        test('should generate file summary with all categories', () => {
            const categories: FileCategories = {
                added: ['new1.ts', 'new2.ts'],
                modified: ['mod1.ts'],
                deleted: ['del1.ts'],
                renamed: [{ from: 'old.ts', to: 'new.ts' }],
                binary: ['image.png'],
            };

            const summary = generateFileSummary(categories);

            assert.ok(summary.includes('Added'));
            assert.ok(summary.includes('Modified'));
            assert.ok(summary.includes('Deleted'));
            assert.ok(summary.includes('Renamed'));
            assert.ok(summary.includes('Binary'));
        });

        test('should include file counts in summary', () => {
            const categories: FileCategories = {
                added: ['f1.ts', 'f2.ts', 'f3.ts'],
                modified: [],
                deleted: [],
                renamed: [],
                binary: [],
            };

            const summary = generateFileSummary(categories);

            assert.ok(summary.includes('3'));
        });
    });

    suite('Token Estimation', () => {
        /**
         * Test: Token estimation accuracy
         */
        test('should estimate tokens based on character count', () => {
            // 4 chars per token
            const text = 'a'.repeat(400);
            const tokens = estimateTokenCount(text);

            assert.strictEqual(tokens, 100);
        });

        test('should handle empty string', () => {
            const tokens = estimateTokenCount('');
            assert.strictEqual(tokens, 0);
        });
    });
});
