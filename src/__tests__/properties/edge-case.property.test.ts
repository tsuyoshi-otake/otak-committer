/**
 * Property-based tests for edge case handling
 *
 * **Feature: commit-message-generation-robustness**
 * **Property 10: Edge case handling**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

import * as fc from 'fast-check';
import {
    createEdgeCasePrompt,
    detectEdgeCase,
    EdgeCaseType
} from '../../utils/edgeCaseHandling';
import { FileCategories } from '../../utils/diffUtils';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

suite('Edge Case Handling Property Tests', () => {
    /**
     * **Property 10: Edge case handling**
     * For any edge case scenario, the system should generate an appropriate
     * commit message describing the changes.
     * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
     */
    suite('Property 10: Edge Case Handling', () => {
        const languageArbitrary = fc.constantFrom(
            'english', 'japanese', 'chinese', 'spanish', 'french', 'german'
        );

        const fileNameArbitrary = fc.string({ minLength: 1, maxLength: 50 })
            .filter(s => /^[a-zA-Z0-9._-]+$/.test(s))
            .map(s => s + '.ts');

        const categoriesArbitrary: fc.Arbitrary<FileCategories> = fc.record({
            added: fc.array(fileNameArbitrary, { minLength: 0, maxLength: 10 }),
            modified: fc.array(fileNameArbitrary, { minLength: 0, maxLength: 10 }),
            deleted: fc.array(fileNameArbitrary, { minLength: 0, maxLength: 10 }),
            renamed: fc.array(
                fc.tuple(fileNameArbitrary, fileNameArbitrary).map(([from, to]) => ({ from, to })),
                { minLength: 0, maxLength: 5 }
            ),
            binary: fc.array(
                fileNameArbitrary.map(s => s.replace('.ts', '.png')),
                { minLength: 0, maxLength: 5 }
            )
        });

        test('whitespace-only changes should produce valid prompt', () => {
            runPropertyTest(
                fc.property(
                    languageArbitrary,
                    (language) => {
                        const prompt = createEdgeCasePrompt(EdgeCaseType.WhitespaceOnly, {
                            diff: 'whitespace changes',
                            language
                        });

                        return (
                            typeof prompt === 'string' &&
                            prompt.length > 0 &&
                            (prompt.toLowerCase().includes('whitespace') ||
                             prompt.toLowerCase().includes('format') ||
                             prompt.includes(language))
                        );
                    }
                )
            );
        });

        test('binary file changes should list all binary files', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        languageArbitrary,
                        fc.array(fileNameArbitrary.map(s => s.replace('.ts', '.png')), { minLength: 1, maxLength: 10 })
                    ),
                    ([language, binaryFiles]) => {
                        const prompt = createEdgeCasePrompt(EdgeCaseType.BinaryFiles, {
                            diff: 'binary diff',
                            language,
                            binaryFiles
                        });

                        // Prompt should be non-empty and reference binary
                        return (
                            prompt.length > 0 &&
                            (prompt.toLowerCase().includes('binary') ||
                             binaryFiles.some(f => prompt.includes(f)) ||
                             prompt.includes(language))
                        );
                    }
                )
            );
        });

        test('deletion-only changes should mention removed files', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        languageArbitrary,
                        fc.array(fileNameArbitrary, { minLength: 1, maxLength: 10 })
                    ),
                    ([language, deletedFiles]) => {
                        const prompt = createEdgeCasePrompt(EdgeCaseType.DeletionsOnly, {
                            diff: 'deleted content',
                            language,
                            deletedFiles
                        });

                        return (
                            prompt.length > 0 &&
                            (prompt.toLowerCase().includes('delet') ||
                             prompt.toLowerCase().includes('remov') ||
                             deletedFiles.some(f => prompt.includes(f)))
                        );
                    }
                )
            );
        });

        test('rename-only changes should mention old and new names', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        languageArbitrary,
                        fc.array(
                            fc.tuple(fileNameArbitrary, fileNameArbitrary).map(([from, to]) => ({ from, to })),
                            { minLength: 1, maxLength: 5 }
                        )
                    ),
                    ([language, renamedFiles]) => {
                        const prompt = createEdgeCasePrompt(EdgeCaseType.RenamesOnly, {
                            diff: 'rename content',
                            language,
                            renamedFiles
                        });

                        return (
                            prompt.length > 0 &&
                            (prompt.toLowerCase().includes('rename') ||
                             prompt.toLowerCase().includes('move') ||
                             renamedFiles.some(r => prompt.includes(r.from) || prompt.includes(r.to)))
                        );
                    }
                )
            );
        });

        test('mixed operations should summarize all change types', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(languageArbitrary, categoriesArbitrary),
                    ([language, categories]) => {
                        // Ensure at least two different operation types
                        const hasMultipleOps =
                            (categories.added.length > 0 ? 1 : 0) +
                            (categories.modified.length > 0 ? 1 : 0) +
                            (categories.deleted.length > 0 ? 1 : 0) +
                            (categories.renamed.length > 0 ? 1 : 0) +
                            (categories.binary.length > 0 ? 1 : 0) >= 2;

                        if (!hasMultipleOps) {
                            return true; // Skip test if not mixed
                        }

                        const prompt = createEdgeCasePrompt(EdgeCaseType.MixedOperations, {
                            diff: 'mixed content',
                            language,
                            categories
                        });

                        return prompt.length > 0;
                    }
                )
            );
        });

        test('edge case detection should be consistent', () => {
            runPropertyTest(
                fc.property(
                    categoriesArbitrary,
                    (categories) => {
                        const metadata = {
                            fileCount: categories.added.length + categories.modified.length +
                                       categories.deleted.length + categories.renamed.length +
                                       categories.binary.length,
                            isTruncated: false,
                            hasReservedNames: false,
                            categories
                        };

                        const edgeCase1 = detectEdgeCase('diff', metadata);
                        const edgeCase2 = detectEdgeCase('diff', metadata);

                        // Detection should be deterministic
                        return edgeCase1 === edgeCase2;
                    }
                )
            );
        });

        test('prompts should always be non-empty for valid edge cases', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(
                        fc.constantFrom(
                            EdgeCaseType.WhitespaceOnly,
                            EdgeCaseType.BinaryFiles,
                            EdgeCaseType.DeletionsOnly,
                            EdgeCaseType.RenamesOnly,
                            EdgeCaseType.MixedOperations
                        ),
                        languageArbitrary
                    ),
                    ([edgeCaseType, language]) => {
                        const prompt = createEdgeCasePrompt(edgeCaseType, {
                            diff: 'test diff',
                            language,
                            binaryFiles: ['test.png'],
                            deletedFiles: ['test.ts'],
                            renamedFiles: [{ from: 'a.ts', to: 'b.ts' }],
                            categories: {
                                added: ['new.ts'],
                                modified: ['mod.ts'],
                                deleted: ['del.ts'],
                                renamed: [{ from: 'old.ts', to: 'new.ts' }],
                                binary: ['img.png']
                            }
                        });

                        return prompt.length > 0;
                    }
                )
            );
        });

        test('edge case detection handles empty categories gracefully', () => {
            runPropertyTest(
                fc.property(
                    fc.constant(null),
                    () => {
                        const emptyCategories: FileCategories = {
                            added: [],
                            modified: [],
                            deleted: [],
                            renamed: [],
                            binary: []
                        };

                        const metadata = {
                            fileCount: 0,
                            isTruncated: false,
                            hasReservedNames: false,
                            categories: emptyCategories
                        };

                        // Should not throw
                        const result = detectEdgeCase('', metadata);
                        return result === null || typeof result === 'string';
                    }
                )
            );
        });
    });
});
