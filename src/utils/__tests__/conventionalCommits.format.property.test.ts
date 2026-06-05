import * as assert from 'assert';
import * as fc from 'fast-check';
import { createTaggedPropertyTest, runPropertyTest } from '../../test/helpers/property-test.helper';
import {
    generateScopeHint,
    getConventionalCommitsFormat,
    getTraditionalFormat,
} from '../conventionalCommits';

suite('Conventional Commits Format Property Tests', () => {
    test(
        'Property 1: Conventional commits format should include scope syntax',
        createTaggedPropertyTest(
            'conventional-commits-format',
            1,
            'Format consistency with configuration - enabled',
            () => {
                const scopeHints = ['auth', 'ui', 'api', ''];
                for (const hint of scopeHints) {
                    const format = getConventionalCommitsFormat(hint);
                    assert.ok(
                        format.includes('<type>(<scope>)') || format.includes('type>(<scope'),
                        `Format should include scope syntax, got: ${format.substring(0, 100)}`,
                    );
                }
            },
        ),
    );

    test('should include scope hint when provided', () => {
        const format = getConventionalCommitsFormat('auth');
        assert.ok(format.includes('auth'), 'Format should include the scope hint');
    });

    test('should not include specific hint when empty', () => {
        const format = getConventionalCommitsFormat('');

        assert.ok(format.includes('<type>(<scope>)'), 'Format should include scope format');
        assert.ok(!format.includes('consider using ""'), 'Should not suggest empty scope');
    });

    test('traditional format should not include scope', () => {
        const format = getTraditionalFormat();

        assert.ok(!format.includes('(<scope>)'), 'Traditional format should not include scope');
        assert.ok(
            format.includes('<prefix>: <subject>') || format.includes('prefix'),
            'Traditional format should include prefix format',
        );
    });

    test(
        'Property 1: Format selection based on configuration',
        createTaggedPropertyTest(
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
                                return format.includes('<scope>') || format.includes('scope');
                            }
                            return !format.includes('(<scope>)');
                        },
                    ),
                );
            },
        ),
    );

    test(
        'Property 5: Format should allow scope omission',
        createTaggedPropertyTest(
            'conventional-commits-format',
            5,
            'Scope omission handling',
            () => {
                const format = getConventionalCommitsFormat('');
                assert.ok(
                    format.toLowerCase().includes('omit') ||
                        format.toLowerCase().includes('optional') ||
                        format.includes('<type>:'),
                    'Format should mention scope can be omitted',
                );
            },
        ),
    );

    test('should allow omission in format instructions', () => {
        const format = getConventionalCommitsFormat('');

        assert.ok(
            format.includes('<type>:') || format.toLowerCase().includes('omit'),
            'Format should show scope-less alternative',
        );
    });

    test(
        'Property 5: Diffs with generic paths should allow scope omission',
        createTaggedPropertyTest(
            'conventional-commits-format',
            5,
            'Scope omission for generic paths',
            () => {
                runPropertyTest(
                    fc.property(
                        fc
                            .array(fc.constantFrom('src', 'lib', 'app', 'dist', 'build'), {
                                minLength: 1,
                                maxLength: 3,
                            })
                            .map((dirs) => dirs.map((d) => `${d}/file.ts`)),
                        (filePaths) => {
                            const scopeHint = generateScopeHint(filePaths);
                            if (scopeHint === '') {
                                const format = getConventionalCommitsFormat(scopeHint);
                                return (
                                    format.toLowerCase().includes('omit') ||
                                    format.includes('<type>:') ||
                                    format.toLowerCase().includes('optional')
                                );
                            }
                            return true;
                        },
                    ),
                );
            },
        ),
    );
});
