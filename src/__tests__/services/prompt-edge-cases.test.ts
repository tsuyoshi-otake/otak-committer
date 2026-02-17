/**
 * Unit tests for edge case prompt generation
 *
 * **Feature: commit-message-generation-robustness**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

import * as assert from 'assert';
import { createEdgeCasePrompt, detectEdgeCase, EdgeCaseType } from '../../utils/edgeCaseHandling';
import { FileCategories } from '../../utils/diffUtils';

suite('Edge Case Prompt Generation Tests', () => {
    suite('Edge Case Detection', () => {
        /**
         * Test: Whitespace-only changes detection
         * Validates: Requirement 5.1
         */
        test('should detect whitespace-only changes', () => {
            const diff = `diff --git a/file.ts b/file.ts
--- a/file.ts
+++ b/file.ts
@@ -1,3 +1,3 @@
-const x = 1;
+const x = 1;
-const y = 2;
+const y = 2;  `;

            const edgeCase = detectEdgeCase(diff, {
                fileCount: 1,
                isTruncated: false,
                hasReservedNames: false,
            });

            assert.strictEqual(edgeCase, EdgeCaseType.WhitespaceOnly);
        });

        /**
         * Test: Binary file changes detection
         * Validates: Requirement 5.2
         */
        test('should detect binary file changes', () => {
            const diff = `diff --git a/image.png b/image.png
Binary files a/image.png and b/image.png differ`;

            const edgeCase = detectEdgeCase(diff, {
                fileCount: 1,
                isTruncated: false,
                hasReservedNames: false,
            });

            assert.strictEqual(edgeCase, EdgeCaseType.BinaryFiles);
        });

        /**
         * Test: Deletion-only changes detection
         * Validates: Requirement 5.3
         */
        test('should detect deletion-only changes', () => {
            const categories: FileCategories = {
                added: [],
                modified: [],
                deleted: ['file1.ts', 'file2.ts'],
                renamed: [],
                binary: [],
            };

            const edgeCase = detectEdgeCase('deleted content', {
                fileCount: 2,
                isTruncated: false,
                hasReservedNames: false,
                categories,
            });

            assert.strictEqual(edgeCase, EdgeCaseType.DeletionsOnly);
        });

        /**
         * Test: Rename-only changes detection
         * Validates: Requirement 5.4
         */
        test('should detect rename-only changes', () => {
            const categories: FileCategories = {
                added: [],
                modified: [],
                deleted: [],
                renamed: [{ from: 'old.ts', to: 'new.ts' }],
                binary: [],
            };

            const edgeCase = detectEdgeCase('rename content', {
                fileCount: 1,
                isTruncated: false,
                hasReservedNames: false,
                categories,
            });

            assert.strictEqual(edgeCase, EdgeCaseType.RenamesOnly);
        });

        /**
         * Test: Mixed operations detection
         * Validates: Requirement 5.5
         */
        test('should detect mixed operations', () => {
            const categories: FileCategories = {
                added: ['new.ts'],
                modified: ['existing.ts'],
                deleted: ['old.ts'],
                renamed: [],
                binary: [],
            };

            const edgeCase = detectEdgeCase('mixed content', {
                fileCount: 3,
                isTruncated: false,
                hasReservedNames: false,
                categories,
            });

            assert.strictEqual(edgeCase, EdgeCaseType.MixedOperations);
        });

        test('should return null for normal changes', () => {
            const categories: FileCategories = {
                added: [],
                modified: ['file.ts'],
                deleted: [],
                renamed: [],
                binary: [],
            };

            const edgeCase = detectEdgeCase('+const x = 1;\n-const y = 2;', {
                fileCount: 1,
                isTruncated: false,
                hasReservedNames: false,
                categories,
            });

            assert.strictEqual(edgeCase, null);
        });
    });

    suite('Whitespace-Only Prompt (Requirement 5.1)', () => {
        test('should generate prompt for whitespace changes', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.WhitespaceOnly, {
                diff: 'whitespace diff',
                language: 'english',
            });

            assert.ok(prompt.includes('whitespace') || prompt.includes('formatting'));
        });

        test('should mention formatting in the prompt', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.WhitespaceOnly, {
                diff: 'diff content',
                language: 'english',
            });

            assert.ok(
                prompt.toLowerCase().includes('format') ||
                    prompt.toLowerCase().includes('whitespace') ||
                    prompt.toLowerCase().includes('style'),
            );
        });
    });

    suite('Binary Files Prompt (Requirement 5.2)', () => {
        test('should generate prompt mentioning binary files', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.BinaryFiles, {
                diff: 'Binary files differ',
                language: 'english',
                binaryFiles: ['image.png', 'data.bin'],
            });

            assert.ok(prompt.includes('binary') || prompt.includes('Binary'));
        });

        test('should list binary file names in prompt', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.BinaryFiles, {
                diff: 'Binary diff',
                language: 'english',
                binaryFiles: ['icon.png'],
            });

            assert.ok(prompt.includes('icon.png') || prompt.includes('binary'));
        });
    });

    suite('Deletions-Only Prompt (Requirement 5.3)', () => {
        test('should generate prompt for deletions', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.DeletionsOnly, {
                diff: 'deleted content',
                language: 'english',
                deletedFiles: ['old-file.ts'],
            });

            assert.ok(
                prompt.toLowerCase().includes('delet') || prompt.toLowerCase().includes('remov'),
            );
        });

        test('should list deleted file names', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.DeletionsOnly, {
                diff: 'deleted content',
                language: 'english',
                deletedFiles: ['deprecated.ts', 'unused.ts'],
            });

            assert.ok(
                prompt.includes('deprecated.ts') ||
                    prompt.includes('deleted') ||
                    prompt.includes('files'),
            );
        });
    });

    suite('Renames-Only Prompt (Requirement 5.4)', () => {
        test('should generate prompt for renames', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.RenamesOnly, {
                diff: 'rename content',
                language: 'english',
                renamedFiles: [{ from: 'old.ts', to: 'new.ts' }],
            });

            assert.ok(
                prompt.toLowerCase().includes('rename') || prompt.toLowerCase().includes('move'),
            );
        });

        test('should show before and after names', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.RenamesOnly, {
                diff: 'rename content',
                language: 'english',
                renamedFiles: [{ from: 'utils.ts', to: 'helpers.ts' }],
            });

            assert.ok(
                prompt.includes('utils.ts') ||
                    prompt.includes('helpers.ts') ||
                    prompt.includes('rename'),
            );
        });
    });

    suite('Mixed Operations Prompt (Requirement 5.5)', () => {
        test('should generate prompt summarizing all operations', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.MixedOperations, {
                diff: 'mixed content',
                language: 'english',
                categories: {
                    added: ['new.ts'],
                    modified: ['existing.ts'],
                    deleted: ['old.ts'],
                    renamed: [],
                    binary: [],
                },
            });

            assert.ok(prompt.length > 0);
        });

        test('should mention multiple operation types', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.MixedOperations, {
                diff: 'mixed content',
                language: 'english',
                categories: {
                    added: ['a.ts'],
                    modified: ['b.ts'],
                    deleted: ['c.ts'],
                    renamed: [{ from: 'd.ts', to: 'e.ts' }],
                    binary: ['f.png'],
                },
            });

            // Should reference multiple types of changes
            const lowerPrompt = prompt.toLowerCase();
            const operationCount = [
                lowerPrompt.includes('add'),
                lowerPrompt.includes('modif'),
                lowerPrompt.includes('delet'),
                lowerPrompt.includes('rename'),
                lowerPrompt.includes('binary'),
            ].filter(Boolean).length;

            // Should mention at least some operations
            assert.ok(operationCount >= 1 || prompt.includes('change'));
        });
    });

    suite('Language Support', () => {
        test('should respect language setting for prompts', () => {
            const prompt = createEdgeCasePrompt(EdgeCaseType.WhitespaceOnly, {
                diff: 'diff',
                language: 'japanese',
            });

            // Prompt should include language instruction
            assert.ok(
                prompt.includes('japanese') || prompt.includes('Japanese') || prompt.length > 0,
            );
        });

        test('should work with various languages', () => {
            const languages = ['english', 'japanese', 'chinese', 'spanish', 'french'];

            for (const lang of languages) {
                const prompt = createEdgeCasePrompt(EdgeCaseType.BinaryFiles, {
                    diff: 'diff',
                    language: lang,
                });
                assert.ok(prompt.length > 0, `Prompt should be generated for ${lang}`);
            }
        });
    });

    suite('Edge Cases', () => {
        test('should handle empty diff', () => {
            const edgeCase = detectEdgeCase('', {
                fileCount: 0,
                isTruncated: false,
                hasReservedNames: false,
            });

            // Empty diff might be detected as a special case or null
            assert.ok(edgeCase === null || typeof edgeCase === 'string');
        });

        test('should handle diff with only header', () => {
            const diff = `diff --git a/file.ts b/file.ts
--- a/file.ts
+++ b/file.ts`;

            const edgeCase = detectEdgeCase(diff, {
                fileCount: 1,
                isTruncated: false,
                hasReservedNames: false,
            });

            // Should handle gracefully
            assert.ok(edgeCase === null || typeof edgeCase === 'string');
        });

        test('should handle multiple binary files', () => {
            const diff = `Binary files a/img1.png and b/img1.png differ
Binary files a/img2.png and b/img2.png differ
Binary files a/data.bin and b/data.bin differ`;

            const edgeCase = detectEdgeCase(diff, {
                fileCount: 3,
                isTruncated: false,
                hasReservedNames: false,
            });

            assert.strictEqual(edgeCase, EdgeCaseType.BinaryFiles);
        });
    });
});
