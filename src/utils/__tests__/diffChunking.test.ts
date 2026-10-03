import * as assert from 'assert';
import * as fc from 'fast-check';
import { FilePriority } from '../../constants/diffClassification';
import { ParsedFileDiff } from '../diff.types';
import { estimateTokenCount } from '../diff.truncate';
import { groupIntoChunks, splitAtLineBoundaries, splitOversizedFile } from '../diffChunking';

function makeFile(filePath: string, content: string): ParsedFileDiff {
    return {
        filePath,
        content,
        additions: 0,
        deletions: 0,
        tokenCount: estimateTokenCount(content),
        priority: FilePriority.HIGH,
    };
}

function sized(filePath: string, tokenCount: number): ParsedFileDiff {
    return makeFile(filePath, 'x'.repeat(tokenCount * 4));
}

function chunkTokens(chunk: ParsedFileDiff[]): number {
    return chunk.reduce((sum, file) => sum + file.tokenCount, 0);
}

suite('diffChunking', () => {
    suite('splitAtLineBoundaries', () => {
        test('cuts at line ends and keeps every character', () => {
            const pieces = splitAtLineBoundaries('aaa\nbbb\nccc\n', 8);

            assert.deepStrictEqual(pieces, ['aaa\nbbb\n', 'ccc\n']);
        });

        test('cuts inside a line only when the line alone is too long', () => {
            const pieces = splitAtLineBoundaries('ab\nccccccc\nd', 3);

            assert.deepStrictEqual(pieces, ['ab\n', 'ccc', 'ccc', 'c\nd']);
        });

        test('property: pieces rejoin to the input and respect the limit', () => {
            fc.assert(
                fc.property(
                    fc.string({ unit: fc.constantFrom('a', 'b', '\n'), maxLength: 400 }),
                    fc.integer({ min: 1, max: 50 }),
                    (text, maxChars) => {
                        const pieces = splitAtLineBoundaries(text, maxChars);
                        assert.strictEqual(pieces.join(''), text);
                        assert.ok(pieces.every((p) => p.length > 0 && p.length <= maxChars));
                    },
                ),
            );
        });
    });

    suite('splitOversizedFile', () => {
        test('returns a file that fits unchanged', () => {
            const file = sized('a.ts', 100);

            assert.deepStrictEqual(splitOversizedFile(file, 100), [file]);
        });

        test('cuts an oversized file into labelled parts that each fit', () => {
            const lines = Array.from({ length: 400 }, (_, i) => `+line ${i} ${'y'.repeat(20)}\n`);
            const file = makeFile(
                'src/huge.ts',
                `diff --git a/src/huge.ts b/src/huge.ts\n${lines.join('')}`,
            );
            const limit = 500;

            const parts = splitOversizedFile(file, limit);

            assert.ok(parts.length > 1);
            parts.forEach((part, index) => {
                const label = `src/huge.ts (part ${index + 1}/${parts.length})`;
                assert.strictEqual(part.filePath, label);
                assert.ok(part.content.startsWith(`# ${label}\n`));
                assert.ok(part.tokenCount <= limit, `${label}: ${part.tokenCount} > ${limit}`);
            });
            assert.strictEqual(
                parts.reduce((sum, part) => sum + part.additions, 0),
                400,
            );
        });
    });

    suite('groupIntoChunks', () => {
        test('should group files into chunks within token limit', () => {
            const chunks = groupIntoChunks(
                [sized('a.ts', 100), sized('b.ts', 100), sized('c.ts', 100)],
                250,
            );

            assert.strictEqual(chunks.length, 2);
            assert.strictEqual(chunks[0].length, 2); // a + b = 200 < 250
            assert.strictEqual(chunks[1].length, 1); // c = 100
        });

        test('never emits a chunk above the limit, even for one huge file', () => {
            const chunks = groupIntoChunks(
                [sized('small.ts', 50), sized('huge.ts', 500), sized('small2.ts', 50)],
                100,
            );

            assert.ok(chunks.length >= 7);
            for (const chunk of chunks) {
                assert.ok(chunkTokens(chunk) <= 100, `chunk of ${chunkTokens(chunk)} tokens`);
            }
            assert.strictEqual(chunks[0][0].filePath, 'small.ts');
            assert.match(chunks[1][0].filePath, /^huge\.ts \(part 1\/\d+\)$/);
            const lastChunk = chunks[chunks.length - 1];
            assert.strictEqual(lastChunk[lastChunk.length - 1].filePath, 'small2.ts');
        });

        test('should return empty array for empty input', () => {
            assert.strictEqual(groupIntoChunks([], 1000).length, 0);
        });

        test('should put all files in one chunk when budget allows', () => {
            const chunks = groupIntoChunks(
                [sized('a.ts', 100), sized('b.ts', 100), sized('c.ts', 100)],
                10000,
            );

            assert.strictEqual(chunks.length, 1);
            assert.strictEqual(chunks[0].length, 3);
        });

        test('should handle single file', () => {
            const chunks = groupIntoChunks([sized('a.ts', 100)], 1000);

            assert.strictEqual(chunks.length, 1);
            assert.strictEqual(chunks[0].length, 1);
        });
    });
});
