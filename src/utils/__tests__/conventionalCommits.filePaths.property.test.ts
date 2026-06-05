import * as assert from 'assert';
import * as fc from 'fast-check';
import { createTaggedPropertyTest, runPropertyTest } from '../../test/helpers/property-test.helper';
import { extractFilePathsFromDiff } from '../conventionalCommits';

suite('Conventional Commits File Path Extraction Property Tests', () => {
    const filePathArbitrary = fc
        .array(fc.stringMatching(/^[a-zA-Z0-9_-]+$/), { minLength: 1, maxLength: 4 })
        .map((parts) => parts.join('/') + '.ts');

    test(
        'Property 3: All file paths in diff headers should be extracted',
        createTaggedPropertyTest(
            'conventional-commits-format',
            3,
            'File path extraction completeness',
            () => {
                runPropertyTest(
                    fc.property(
                        fc.array(filePathArbitrary, { minLength: 1, maxLength: 5 }),
                        (filePaths) => {
                            const diff = filePaths
                                .map(
                                    (fp) =>
                                        `diff --git a/${fp} b/${fp}\n--- a/${fp}\n+++ b/${fp}\n@@ -1,1 +1,1 @@\n-old\n+new`,
                                )
                                .join('\n');

                            const extracted = extractFilePathsFromDiff(diff);

                            return filePaths.every((fp) => extracted.includes(fp));
                        },
                    ),
                );
            },
        ),
    );

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
