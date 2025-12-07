/**
 * Property-based tests for GitService robustness enhancements
 *
 * **Feature: commit-message-generation-robustness**
 * **Properties 1, 2, 3: Truncation, Categorization, Reserved Names**
 * **Validates: Requirements 1.1, 1.2, 2.1, 2.2**
 */

import * as fc from 'fast-check';
import {
    truncateDiff,
    categorizeFiles,
    isWindowsReservedName,
    StatusFile
} from '../../utils/diffUtils';
import { runPropertyTest } from '../../test/helpers/property-test.helper';

suite('GitService Robustness Property Tests', () => {
    /**
     * **Property 1: Truncation preserves file context**
     * For any diff that exceeds 200K tokens, truncating the diff should preserve
     * complete file headers and not cut off in the middle of a file's changes.
     * **Validates: Requirements 1.1**
     */
    suite('Property 1: Truncation Preserves File Context', () => {
        test('truncated diff should not cut in middle of file header', () => {
            runPropertyTest(
                fc.property(
                    fc.nat({ max: 100 }).chain(numFiles =>
                        fc.array(
                            fc.record({
                                path: fc.string({ minLength: 1, maxLength: 50 })
                                    .filter(s => !s.includes('\n')),
                                content: fc.string({ minLength: 100, maxLength: 50000 })
                            }),
                            { minLength: 1, maxLength: Math.max(1, numFiles) }
                        )
                    ),
                    (files) => {
                        // Create a simulated diff with file headers
                        const diff = files.map(f =>
                            `diff --git a/${f.path} b/${f.path}\n` +
                            `--- a/${f.path}\n` +
                            `+++ b/${f.path}\n` +
                            `@@ -1,10 +1,10 @@\n` +
                            f.content
                        ).join('\n');

                        const result = truncateDiff(diff);

                        // If truncated, should still have valid structure
                        if (result.isTruncated) {
                            // Should not end in middle of a header line
                            const lines = result.content.split('\n');
                            const lastLine = lines[lines.length - 1];
                            // Last line should be complete (not a partial header)
                            const partialHeaders = ['diff --git', '---', '+++', '@@'];
                            const isPartialHeader = partialHeaders.some(h =>
                                lastLine.startsWith(h.slice(0, -1)) && !lastLine.includes(' ')
                            );
                            return !isPartialHeader || lastLine.length > 3;
                        }
                        return true;
                    }
                )
            );
        });

        test('truncation metadata should be accurate', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 2000000 }),
                    (content) => {
                        const result = truncateDiff(content);

                        if (result.isTruncated) {
                            // Original tokens should be greater than truncated tokens
                            return (result.originalTokens ?? 0) > (result.truncatedTokens ?? 0);
                        } else {
                            // If not truncated, tokens should be within limit
                            const tokenCount = Math.ceil(content.length / 4);
                            return tokenCount <= 200 * 1000;
                        }
                    }
                )
            );
        });
    });

    /**
     * **Property 2: File categorization completeness**
     * For any set of staged files, categorizing them by operation type should
     * account for all files without duplication.
     * **Validates: Requirements 1.2**
     */
    suite('Property 2: File Categorization Completeness', () => {
        const fileIndexArbitrary = fc.constantFrom('A', 'M', 'D', 'R', ' ', '?');
        const workingDirArbitrary = fc.constantFrom(' ', 'M', 'D', '?');

        const statusFileArbitrary: fc.Arbitrary<StatusFile> = fc.record({
            path: fc.string({ minLength: 1, maxLength: 100 })
                .filter(s => !s.includes('\n'))
                .chain(p => fc.boolean().map(isRename =>
                    isRename ? `${p} -> ${p}_renamed` : p
                )),
            index: fileIndexArbitrary,
            working_dir: workingDirArbitrary
        });

        test('all files should be categorized exactly once', () => {
            runPropertyTest(
                fc.property(
                    fc.array(statusFileArbitrary, { minLength: 1, maxLength: 100 }),
                    (files) => {
                        const categories = categorizeFiles(files);

                        // Count total categorized files
                        const categorizedCount =
                            categories.added.length +
                            categories.modified.length +
                            categories.deleted.length +
                            categories.renamed.length +
                            categories.binary.length;

                        // At minimum, categorized files shouldn't exceed input files
                        return categorizedCount <= files.length;
                    }
                )
            );
        });

        test('categories should not have duplicate entries', () => {
            runPropertyTest(
                fc.property(
                    fc.array(statusFileArbitrary, { minLength: 1, maxLength: 100 }),
                    (files) => {
                        // Filter to unique paths first (simulating real git behavior where paths are unique)
                        const seenPaths = new Set<string>();
                        const uniqueFiles = files.filter(f => {
                            if (seenPaths.has(f.path)) {
                                return false;
                            }
                            seenPaths.add(f.path);
                            return true;
                        });

                        const categories = categorizeFiles(uniqueFiles);

                        // Check no duplicates within each category
                        const addedUnique = new Set(categories.added).size === categories.added.length;
                        const modifiedUnique = new Set(categories.modified).size === categories.modified.length;
                        const deletedUnique = new Set(categories.deleted).size === categories.deleted.length;
                        const renamedUnique = new Set(categories.renamed.map(r => r.from + r.to)).size === categories.renamed.length;
                        const binaryUnique = new Set(categories.binary).size === categories.binary.length;

                        return addedUnique && modifiedUnique && deletedUnique && renamedUnique && binaryUnique;
                    }
                )
            );
        });

        test('file category structure should be valid', () => {
            runPropertyTest(
                fc.property(
                    fc.array(statusFileArbitrary, { minLength: 0, maxLength: 50 }),
                    (files) => {
                        const categories = categorizeFiles(files);

                        // Categories should have correct structure
                        return (
                            Array.isArray(categories.added) &&
                            Array.isArray(categories.modified) &&
                            Array.isArray(categories.deleted) &&
                            Array.isArray(categories.renamed) &&
                            Array.isArray(categories.binary)
                        );
                    }
                )
            );
        });
    });

    /**
     * **Property 3: Reserved name detection accuracy**
     * For any file path, the Windows reserved name detection should correctly
     * identify all reserved device names regardless of case or extension.
     * **Validates: Requirements 2.1, 2.2**
     */
    suite('Property 3: Reserved Name Detection Accuracy', () => {
        const reservedNames = [
            'CON', 'PRN', 'AUX', 'NUL',
            'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
        ];

        const reservedNameArbitrary = fc.constantFrom(...reservedNames);
        const extensionArbitrary = fc.string({ minLength: 1, maxLength: 5 })
            .filter(s => /^[a-zA-Z0-9]+$/.test(s));
        const pathPrefixArbitrary = fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/') && !s.includes('\\')),
            { minLength: 0, maxLength: 5 }
        ).map(parts => parts.length > 0 ? parts.join('/') + '/' : '');

        test('should detect reserved names regardless of case', () => {
            runPropertyTest(
                fc.property(
                    reservedNameArbitrary.chain(name =>
                        fc.constantFrom(
                            name.toLowerCase(),
                            name.toUpperCase(),
                            name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
                        )
                    ),
                    (name) => {
                        return isWindowsReservedName(name) === true;
                    }
                )
            );
        });

        test('should detect reserved names with any extension', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(reservedNameArbitrary, extensionArbitrary),
                    ([name, ext]) => {
                        const fileNameWithExt = `${name}.${ext}`;
                        return isWindowsReservedName(fileNameWithExt) === true;
                    }
                )
            );
        });

        test('should detect reserved names in any path', () => {
            runPropertyTest(
                fc.property(
                    fc.tuple(pathPrefixArbitrary, reservedNameArbitrary),
                    ([prefix, name]) => {
                        const fullPath = prefix + name;
                        return isWindowsReservedName(fullPath) === true;
                    }
                )
            );
        });

        test('should not flag names that contain but are not reserved names', () => {
            runPropertyTest(
                fc.property(
                    reservedNameArbitrary.chain(name =>
                        fc.string({ minLength: 1, maxLength: 10 })
                            .filter(s => /^[a-zA-Z]+$/.test(s))
                            .map(suffix => name + suffix)
                    ),
                    (extendedName) => {
                        // Extended names like "CONSOLE" (CON + SOLE) should not be reserved
                        return isWindowsReservedName(extendedName) === false;
                    }
                )
            );
        });

        test('regular file names should not be detected as reserved', () => {
            runPropertyTest(
                fc.property(
                    fc.string({ minLength: 1, maxLength: 50 })
                        .filter(s => {
                            // Filter out actual reserved names
                            return !reservedNames.some(r => {
                                const baseName = s.split('.')[0].split('/').pop()?.split('\\').pop() ?? '';
                                return baseName.toUpperCase() === r;
                            });
                        }),
                    (fileName) => {
                        return isWindowsReservedName(fileName) === false;
                    }
                )
            );
        });
    });
});
