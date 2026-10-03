import * as assert from 'assert';
import { splitNulSeparatedPaths } from '../index';

suite('File helpers', () => {
    suite('splitNulSeparatedPaths', () => {
        test('returns non-ASCII and special-character paths verbatim', () => {
            // `git ls-files` without -z would print "\346\227\245..." C-quoted names.
            const output = ['日本語/ファイル.ts', 'with space.ts', 'tab\there.ts', 'q"uote.ts', ''].join(
                '\0',
            );

            assert.deepStrictEqual(splitNulSeparatedPaths(output), [
                '日本語/ファイル.ts',
                'with space.ts',
                'tab\there.ts',
                'q"uote.ts',
            ]);
        });

        test('keeps leading and trailing spaces that are part of a file name', () => {
            assert.deepStrictEqual(splitNulSeparatedPaths(' lead.ts\0trail.ts \0'), [
                ' lead.ts',
                'trail.ts ',
            ]);
        });

        test('returns an empty list for empty output', () => {
            assert.deepStrictEqual(splitNulSeparatedPaths(''), []);
        });
    });
});
