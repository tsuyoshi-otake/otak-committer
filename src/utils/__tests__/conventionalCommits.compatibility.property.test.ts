import * as assert from 'assert';
import * as fc from 'fast-check';
import { createTaggedPropertyTest, runPropertyTest } from '../../test/helpers/property-test.helper';
import {
    extractFilePathsFromDiff,
    generateScopeHint,
    getConventionalCommitsFormat,
    getTraditionalFormat,
} from '../conventionalCommits';

suite('Conventional Commits Compatibility Property Tests', () => {
    test(
        'Property 4: Format functions should not modify other prompt parts',
        createTaggedPropertyTest(
            'conventional-commits-format',
            4,
            'Backward compatibility preservation',
            () => {
                const conventionalFormat = getConventionalCommitsFormat('test');
                const traditionalFormat = getTraditionalFormat();

                assert.ok(conventionalFormat.length > 0, 'Conventional format should not be empty');
                assert.ok(traditionalFormat.length > 0, 'Traditional format should not be empty');

                assert.ok(
                    !conventionalFormat.includes('useEmoji'),
                    'Format should not contain config keys',
                );
                assert.ok(
                    !conventionalFormat.includes('customMessage'),
                    'Format should not contain config keys',
                );
                assert.ok(
                    !traditionalFormat.includes('useEmoji'),
                    'Format should not contain config keys',
                );
                assert.ok(
                    !traditionalFormat.includes('customMessage'),
                    'Format should not contain config keys',
                );
            },
        ),
    );

    test('should preserve format structure with different scope hints', () => {
        runPropertyTest(
            fc.property(fc.string({ minLength: 0, maxLength: 50 }), (scopeHint) => {
                const format = getConventionalCommitsFormat(scopeHint);

                return (
                    format.includes('<type>') &&
                    format.includes('<subject>') &&
                    format.includes('<scope>')
                );
            }),
        );
    });

    test('extractFilePathsFromDiff should not modify original diff', () => {
        runPropertyTest(
            fc.property(fc.string({ minLength: 0, maxLength: 1000 }), (diff) => {
                const originalDiff = diff;
                extractFilePathsFromDiff(diff);

                return diff === originalDiff;
            }),
        );
    });

    test('generateScopeHint should not modify original file paths array', () => {
        runPropertyTest(
            fc.property(fc.array(fc.string(), { minLength: 0, maxLength: 10 }), (filePaths) => {
                const originalLength = filePaths.length;
                const originalPaths = [...filePaths];
                generateScopeHint(filePaths);

                return (
                    filePaths.length === originalLength &&
                    filePaths.every((p, i) => p === originalPaths[i])
                );
            }),
        );
    });
});
