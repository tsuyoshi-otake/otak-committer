import * as assert from 'assert';
import * as fc from 'fast-check';
import { createTaggedPropertyTest, runPropertyTest } from '../../test/helpers/property-test.helper';
import { generateScopeHint } from '../conventionalCommits';

suite('Conventional Commits Scope Hint Property Tests', () => {
    const meaningfulDirArbitrary = fc.constantFrom(
        'services',
        'components',
        'utils',
        'auth',
        'api',
        'ui',
        'models',
        'hooks',
    );

    test(
        'Property 2: Meaningful directories should produce non-empty scope hint',
        createTaggedPropertyTest(
            'conventional-commits-format',
            2,
            'Scope hint extraction for meaningful directories',
            () => {
                runPropertyTest(
                    fc.property(
                        fc.array(meaningfulDirArbitrary, { minLength: 1, maxLength: 3 }),
                        (dirs) => {
                            const filePaths = dirs.map((d) => `src/${d}/file.ts`);
                            const scopeHint = generateScopeHint(filePaths);
                            return scopeHint.length > 0;
                        },
                    ),
                );
            },
        ),
    );

    test('should return empty string for only generic directories', () => {
        const filePaths = ['src/file.ts', 'lib/utils.ts', 'app/main.ts'];
        const scopeHint = generateScopeHint(filePaths);

        assert.strictEqual(scopeHint, '');
    });

    test('should extract scope from nested directory', () => {
        const filePaths = ['src/services/auth/login.ts', 'src/services/auth/logout.ts'];
        const scopeHint = generateScopeHint(filePaths);

        assert.ok(
            scopeHint === 'services' || scopeHint === 'auth',
            `Expected 'services' or 'auth', got '${scopeHint}'`,
        );
    });

    test('should return most common scope when multiple areas changed', () => {
        const filePaths = [
            'src/services/auth.ts',
            'src/services/api.ts',
            'src/components/Button.tsx',
        ];
        const scopeHint = generateScopeHint(filePaths);

        assert.strictEqual(scopeHint, 'services');
    });

    test('should return empty for empty file paths', () => {
        const scopeHint = generateScopeHint([]);
        assert.strictEqual(scopeHint, '');
    });

    test('should handle single file path', () => {
        const scopeHint = generateScopeHint(['src/components/ui/Button.tsx']);
        assert.strictEqual(scopeHint, 'components');
    });
});
