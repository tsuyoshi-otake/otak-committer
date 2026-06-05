import * as assert from 'assert';
import {
    extractFilePathsFromDiff,
    generateScopeHint,
    getConventionalCommitsFormat,
    getTraditionalFormat,
} from '../conventionalCommits';

suite('Conventional Commits Unit Tests', () => {
    suite('extractFilePathsFromDiff', () => {
        test('should handle renamed files', () => {
            const diff = `diff --git a/old-name.ts b/new-name.ts
similarity index 95%
rename from old-name.ts
rename to new-name.ts`;
            const paths = extractFilePathsFromDiff(diff);

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

            assert.notStrictEqual(scope, 'src');
        });

        test('should handle test files', () => {
            const filePaths = ['src/__tests__/auth.test.ts', 'src/__tests__/api.test.ts'];
            const scope = generateScopeHint(filePaths);

            assert.ok(scope === '__tests__' || scope === 'tests' || scope === '');
        });

        test('should handle config files at root', () => {
            const filePaths = ['package.json', 'tsconfig.json', '.eslintrc.js'];
            const scope = generateScopeHint(filePaths);

            assert.ok(typeof scope === 'string');
        });

        test('should count directory frequency correctly', () => {
            const filePaths = [
                'src/auth/login.ts',
                'src/auth/logout.ts',
                'src/auth/refresh.ts',
                'src/api/client.ts',
            ];
            const scope = generateScopeHint(filePaths);

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
            assert.ok(
                format.includes('<prefix>') || format.includes('prefix'),
                'Should include prefix placeholder',
            );
        });
    });
});
