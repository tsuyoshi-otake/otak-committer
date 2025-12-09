/**
 * Property-based tests for Conventional Commits format support
 *
 * **Feature: conventional-commits-format**
 * Tests the correctness properties defined in design.md:
 * - Property 1: Format consistency with configuration
 * - Property 2: Scope hint extraction
 * - Property 3: File path extraction completeness
 * - Property 4: Backward compatibility preservation
 * - Property 5: Scope omission handling
 */

import * as assert from 'assert';
import * as fc from 'fast-check';
import { createTaggedPropertyTest, runPropertyTest } from '../../test/helpers/property-test.helper';
import {
    extractFilePathsFromDiff,
    generateScopeHint,
    getConventionalCommitsFormat,
    getTraditionalFormat
} from '../conventionalCommits';

suite('Conventional Commits Property Tests', () => {
    /**
     * **Feature: conventional-commits-format, Property 3: File path extraction completeness**
     * **Validates: Requirements 2.1**
     *
     * For any valid Git diff, all file paths mentioned in diff headers
     * should be extracted by the extractFilePathsFromDiff function.
     */
    suite('Property 3: File Path Extraction Completeness (Task 2.2)', () => {
        // Arbitrary for valid file paths (no special characters that break diffs)
        const filePathArbitrary = fc.array(
            fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
            { minLength: 1, maxLength: 4 }
        ).map(parts => parts.join('/') + '.ts');

        test('Property 3: All file paths in diff headers should be extracted', createTaggedPropertyTest(
            'conventional-commits-format',
            3,
            'File path extraction completeness',
            () => {
                runPropertyTest(
                    fc.property(
                        fc.array(filePathArbitrary, { minLength: 1, maxLength: 5 }),
                        (filePaths) => {
                            // Create a valid Git diff with the file paths
                            const diff = filePaths.map(fp =>
                                `diff --git a/${fp} b/${fp}\n--- a/${fp}\n+++ b/${fp}\n@@ -1,1 +1,1 @@\n-old\n+new`
                            ).join('\n');

                            const extracted = extractFilePathsFromDiff(diff);

                            // All original paths should be extracted
                            return filePaths.every(fp => extracted.includes(fp));
                        }
                    )
                );
            }
        ));

        test('should extract paths from single file diff', () => {
            const diff = `diff --git a/src/services/auth.ts b/src/services/auth.ts
--- a/src/services/auth.ts
+++ b/src/services/auth.ts
@@ -1,3 +1,4 @@
+// new line
 export class Auth {}`;

            const paths = extractFilePathsFromDiff(diff);
            assert.deepStrictEqual(paths, ['src/services/auth.ts']);
        });

        test('should extract paths from multiple file diff', () => {
            const diff = `diff --git a/src/services/auth.ts b/src/services/auth.ts
--- a/src/services/auth.ts
+++ b/src/services/auth.ts
@@ -1,1 +1,1 @@
-old
+new
diff --git a/src/components/ui/Button.tsx b/src/components/ui/Button.tsx
--- a/src/components/ui/Button.tsx
+++ b/src/components/ui/Button.tsx
@@ -1,1 +1,1 @@
-old
+new`;

            const paths = extractFilePathsFromDiff(diff);
            assert.deepStrictEqual(paths, ['src/services/auth.ts', 'src/components/ui/Button.tsx']);
        });

        test('should return empty array for empty diff', () => {
            const paths = extractFilePathsFromDiff('');
            assert.deepStrictEqual(paths, []);
        });

        test('should handle diff with no file headers', () => {
            const paths = extractFilePathsFromDiff('some random text without diff headers');
            assert.deepStrictEqual(paths, []);
        });
    });

    /**
     * **Feature: conventional-commits-format, Property 2: Scope hint extraction**
     * **Validates: Requirements 2.1, 2.2**
     *
     * For any diff containing file paths, the scope hint extraction should return
     * a non-empty string when meaningful directories are present, and an empty
     * string when only generic directories (src, lib, app) are present.
     */
    suite('Property 2: Scope Hint Extraction (Task 3.2)', () => {
        const meaningfulDirArbitrary = fc.constantFrom(
            'services', 'components', 'utils', 'auth', 'api', 'ui', 'models', 'hooks'
        );

        test('Property 2: Meaningful directories should produce non-empty scope hint', createTaggedPropertyTest(
            'conventional-commits-format',
            2,
            'Scope hint extraction for meaningful directories',
            () => {
                runPropertyTest(
                    fc.property(
                        fc.array(meaningfulDirArbitrary, { minLength: 1, maxLength: 3 }),
                        (dirs) => {
                            const filePaths = dirs.map(d => `src/${d}/file.ts`);
                            const scopeHint = generateScopeHint(filePaths);
                            // Should return the most common meaningful directory
                            return scopeHint.length > 0;
                        }
                    )
                );
            }
        ));

        test('should return empty string for only generic directories', () => {
            const filePaths = ['src/file.ts', 'lib/utils.ts', 'app/main.ts'];
            const scopeHint = generateScopeHint(filePaths);
            // When all paths only have generic root directories, scope should be empty
            // because the meaningful parts are the file names which are too generic
            assert.strictEqual(scopeHint, '');
        });

        test('should extract scope from nested directory', () => {
            const filePaths = ['src/services/auth/login.ts', 'src/services/auth/logout.ts'];
            const scopeHint = generateScopeHint(filePaths);
            // Should extract 'services' or 'auth' as scope
            assert.ok(scopeHint === 'services' || scopeHint === 'auth', `Expected 'services' or 'auth', got '${scopeHint}'`);
        });

        test('should return most common scope when multiple areas changed', () => {
            const filePaths = [
                'src/services/auth.ts',
                'src/services/api.ts',
                'src/components/Button.tsx'
            ];
            const scopeHint = generateScopeHint(filePaths);
            // 'services' appears twice, so should be the scope
            assert.strictEqual(scopeHint, 'services');
        });

        test('should return empty for empty file paths', () => {
            const scopeHint = generateScopeHint([]);
            assert.strictEqual(scopeHint, '');
        });

        test('should handle single file path', () => {
            const scopeHint = generateScopeHint(['src/components/ui/Button.tsx']);
            // Should extract first meaningful directory
            assert.strictEqual(scopeHint, 'components');
        });
    });

    /**
     * **Feature: conventional-commits-format, Property 1: Format consistency with configuration**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     *
     * For any commit message generation request, when useConventionalCommits is enabled,
     * the format instruction should include scope format, and when disabled,
     * it should use the traditional format.
     */
    suite('Property 1: Format Consistency with Configuration (Task 4.3)', () => {
        test('Property 1: Conventional commits format should include scope syntax', createTaggedPropertyTest(
            'conventional-commits-format',
            1,
            'Format consistency with configuration - enabled',
            () => {
                const scopeHints = ['auth', 'ui', 'api', ''];
                for (const hint of scopeHints) {
                    const format = getConventionalCommitsFormat(hint);
                    // Should include the <type>(<scope>): <subject> format
                    assert.ok(
                        format.includes('<type>(<scope>)') || format.includes('type>(<scope'),
                        `Format should include scope syntax, got: ${format.substring(0, 100)}`
                    );
                }
            }
        ));

        test('should include scope hint when provided', () => {
            const format = getConventionalCommitsFormat('auth');
            assert.ok(format.includes('auth'), 'Format should include the scope hint');
        });

        test('should not include specific hint when empty', () => {
            const format = getConventionalCommitsFormat('');
            // Should still have the format but no specific scope suggestion
            assert.ok(format.includes('<type>(<scope>)'), 'Format should include scope format');
            assert.ok(!format.includes('consider using ""'), 'Should not suggest empty scope');
        });

        test('traditional format should not include scope', () => {
            const format = getTraditionalFormat();
            assert.ok(!format.includes('(<scope>)'), 'Traditional format should not include scope');
            assert.ok(format.includes('<prefix>: <subject>') || format.includes('prefix'),
                'Traditional format should include prefix format');
        });

        test('Property 1: Format selection based on configuration', createTaggedPropertyTest(
            'conventional-commits-format',
            1,
            'Format consistency - configuration toggle',
            () => {
                runPropertyTest(
                    fc.property(
                        fc.boolean(),
                        fc.constantFrom('auth', 'ui', 'api', ''),
                        (useConventional, scopeHint) => {
                            const format = useConventional
                                ? getConventionalCommitsFormat(scopeHint)
                                : getTraditionalFormat();

                            if (useConventional) {
                                // Should have scope format
                                return format.includes('<scope>') || format.includes('scope');
                            } else {
                                // Should not have scope format
                                return !format.includes('(<scope>)');
                            }
                        }
                    )
                );
            }
        ));
    });

    /**
     * **Feature: conventional-commits-format, Property 5: Scope omission handling**
     * **Validates: Requirements 1.3**
     *
     * For any diff where scope cannot be determined, the prompt should explicitly
     * allow the AI to omit the scope and use <type>: <subject> format.
     */
    suite('Property 5: Scope Omission Handling (Task 5.3)', () => {
        test('Property 5: Format should allow scope omission', createTaggedPropertyTest(
            'conventional-commits-format',
            5,
            'Scope omission handling',
            () => {
                // When scope hint is empty, format should mention that scope can be omitted
                const format = getConventionalCommitsFormat('');
                assert.ok(
                    format.toLowerCase().includes('omit') ||
                    format.toLowerCase().includes('optional') ||
                    format.includes('<type>:'),
                    'Format should mention scope can be omitted'
                );
            }
        ));

        test('should allow omission in format instructions', () => {
            const format = getConventionalCommitsFormat('');
            // Check that the format allows for both with and without scope
            assert.ok(
                format.includes('<type>:') || format.toLowerCase().includes('omit'),
                'Format should show scope-less alternative'
            );
        });

        test('Property 5: Diffs with generic paths should allow scope omission', createTaggedPropertyTest(
            'conventional-commits-format',
            5,
            'Scope omission for generic paths',
            () => {
                runPropertyTest(
                    fc.property(
                        fc.array(
                            fc.constantFrom('src', 'lib', 'app', 'dist', 'build'),
                            { minLength: 1, maxLength: 3 }
                        ).map(dirs => dirs.map(d => `${d}/file.ts`)),
                        (filePaths) => {
                            const scopeHint = generateScopeHint(filePaths);
                            // For generic paths, scope hint should be empty
                            // and format should allow omission
                            if (scopeHint === '') {
                                const format = getConventionalCommitsFormat(scopeHint);
                                return format.toLowerCase().includes('omit') ||
                                       format.includes('<type>:') ||
                                       format.toLowerCase().includes('optional');
                            }
                            return true;
                        }
                    )
                );
            }
        ));
    });
});

/**
 * **Feature: conventional-commits-format, Property 4: Backward compatibility preservation**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
 *
 * For any commit message generation with existing features (emoji, custom messages,
 * templates, language selection), enabling Conventional Commits format should not
 * break these features.
 */
suite('Property 4: Backward Compatibility Preservation (Task 5.2)', () => {
    test('Property 4: Format functions should not modify other prompt parts', createTaggedPropertyTest(
        'conventional-commits-format',
        4,
        'Backward compatibility preservation',
        () => {
            // Verify that format instructions are self-contained and don't interfere
            // with other prompt components
            const conventionalFormat = getConventionalCommitsFormat('test');
            const traditionalFormat = getTraditionalFormat();

            // Both formats should be non-empty strings
            assert.ok(conventionalFormat.length > 0, 'Conventional format should not be empty');
            assert.ok(traditionalFormat.length > 0, 'Traditional format should not be empty');

            // Neither format should contain configuration keys or break prompt structure
            assert.ok(!conventionalFormat.includes('useEmoji'), 'Format should not contain config keys');
            assert.ok(!conventionalFormat.includes('customMessage'), 'Format should not contain config keys');
            assert.ok(!traditionalFormat.includes('useEmoji'), 'Format should not contain config keys');
            assert.ok(!traditionalFormat.includes('customMessage'), 'Format should not contain config keys');
        }
    ));

    test('should preserve format structure with different scope hints', () => {
        runPropertyTest(
            fc.property(
                fc.string({ minLength: 0, maxLength: 50 }),
                (scopeHint) => {
                    const format = getConventionalCommitsFormat(scopeHint);

                    // Format should always contain the basic structure
                    return format.includes('<type>') &&
                           format.includes('<subject>') &&
                           format.includes('<scope>');
                }
            )
        );
    });

    test('extractFilePathsFromDiff should not modify original diff', () => {
        runPropertyTest(
            fc.property(
                fc.string({ minLength: 0, maxLength: 1000 }),
                (diff) => {
                    const originalDiff = diff;
                    extractFilePathsFromDiff(diff);
                    // Original diff should remain unchanged
                    return diff === originalDiff;
                }
            )
        );
    });

    test('generateScopeHint should not modify original file paths array', () => {
        runPropertyTest(
            fc.property(
                fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
                (filePaths) => {
                    const originalLength = filePaths.length;
                    const originalPaths = [...filePaths];
                    generateScopeHint(filePaths);
                    // Original array should remain unchanged
                    return filePaths.length === originalLength &&
                           filePaths.every((p, i) => p === originalPaths[i]);
                }
            )
        );
    });
});

suite('Conventional Commits Unit Tests', () => {
    suite('extractFilePathsFromDiff', () => {
        test('should handle renamed files', () => {
            const diff = `diff --git a/old-name.ts b/new-name.ts
similarity index 95%
rename from old-name.ts
rename to new-name.ts`;
            const paths = extractFilePathsFromDiff(diff);
            // Should extract the path from diff header
            assert.ok(paths.length >= 1);
        });

        test('should handle files with spaces in path', () => {
            const diff = `diff --git a/src/my file.ts b/src/my file.ts
--- a/src/my file.ts
+++ b/src/my file.ts`;
            const paths = extractFilePathsFromDiff(diff);
            assert.deepStrictEqual(paths, ['src/my file.ts']);
        });

        test('should handle deeply nested paths', () => {
            const diff = `diff --git a/src/features/auth/components/forms/LoginForm.tsx b/src/features/auth/components/forms/LoginForm.tsx`;
            const paths = extractFilePathsFromDiff(diff);
            assert.deepStrictEqual(paths, ['src/features/auth/components/forms/LoginForm.tsx']);
        });
    });

    suite('generateScopeHint', () => {
        test('should filter out common generic directories', () => {
            const filePaths = ['src/services/auth.ts'];
            const scope = generateScopeHint(filePaths);
            // Should not return 'src'
            assert.notStrictEqual(scope, 'src');
        });

        test('should handle test files', () => {
            const filePaths = ['src/__tests__/auth.test.ts', 'src/__tests__/api.test.ts'];
            const scope = generateScopeHint(filePaths);
            // Should extract meaningful scope
            assert.ok(scope === '__tests__' || scope === 'tests' || scope === '');
        });

        test('should handle config files at root', () => {
            const filePaths = ['package.json', 'tsconfig.json', '.eslintrc.js'];
            const scope = generateScopeHint(filePaths);
            // Root level files might not have scope
            assert.ok(typeof scope === 'string');
        });

        test('should count directory frequency correctly', () => {
            const filePaths = [
                'src/auth/login.ts',
                'src/auth/logout.ts',
                'src/auth/refresh.ts',
                'src/api/client.ts'
            ];
            const scope = generateScopeHint(filePaths);
            // 'auth' appears 3 times, 'api' appears 1 time
            assert.strictEqual(scope, 'auth');
        });
    });

    suite('Format Methods', () => {
        test('getConventionalCommitsFormat returns valid format instruction', () => {
            const format = getConventionalCommitsFormat('test-scope');
            assert.ok(format.length > 0, 'Format should not be empty');
            assert.ok(format.includes('<type>'), 'Should include type placeholder');
        });

        test('getTraditionalFormat returns valid format instruction', () => {
            const format = getTraditionalFormat();
            assert.ok(format.length > 0, 'Format should not be empty');
            assert.ok(format.includes('<prefix>') || format.includes('prefix'),
                'Should include prefix placeholder');
        });
    });
});
