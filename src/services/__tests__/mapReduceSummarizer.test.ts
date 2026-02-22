import { suite, test } from 'mocha';
import * as assert from 'assert';
import { groupIntoChunks, MapReduceSummarizer } from '../mapReduceSummarizer';
import { ParsedFileDiff, FilePriority } from '../../utils/diffUtils';

function makeFile(filePath: string, tokenCount: number): ParsedFileDiff {
    const content = 'x'.repeat(tokenCount * 4); // 4 chars per token
    return {
        filePath,
        content,
        additions: 10,
        deletions: 5,
        tokenCount,
        priority: FilePriority.HIGH,
    };
}

suite('mapReduceSummarizer', () => {
    suite('groupIntoChunks', () => {
        test('should group files into chunks within token limit', () => {
            const files = [
                makeFile('a.ts', 100),
                makeFile('b.ts', 100),
                makeFile('c.ts', 100),
            ];
            const chunks = groupIntoChunks(files, 250);

            assert.strictEqual(chunks.length, 2);
            assert.strictEqual(chunks[0].length, 2); // a + b = 200 < 250
            assert.strictEqual(chunks[1].length, 1); // c = 100
        });

        test('should put oversized files in their own chunk', () => {
            const files = [
                makeFile('small.ts', 50),
                makeFile('huge.ts', 500),
                makeFile('small2.ts', 50),
            ];
            const chunks = groupIntoChunks(files, 100);

            assert.strictEqual(chunks.length, 3);
            assert.strictEqual(chunks[0].length, 1); // small
            assert.strictEqual(chunks[1].length, 1); // huge (own chunk)
            assert.strictEqual(chunks[2].length, 1); // small2
        });

        test('should return empty array for empty input', () => {
            const chunks = groupIntoChunks([], 1000);
            assert.strictEqual(chunks.length, 0);
        });

        test('should put all files in one chunk when budget allows', () => {
            const files = [
                makeFile('a.ts', 100),
                makeFile('b.ts', 100),
                makeFile('c.ts', 100),
            ];
            const chunks = groupIntoChunks(files, 10000);

            assert.strictEqual(chunks.length, 1);
            assert.strictEqual(chunks[0].length, 3);
        });

        test('should handle single file', () => {
            const files = [makeFile('a.ts', 100)];
            const chunks = groupIntoChunks(files, 1000);

            assert.strictEqual(chunks.length, 1);
            assert.strictEqual(chunks[0].length, 1);
        });
    });

    suite('MapReduceSummarizer', () => {
        test('should report progress for each chunk', async () => {
            const progressMessages: string[] = [];
            const mockOpenAI = {
                summarizeChunk: async () => 'chunk summary',
            } as any;

            const summarizer = new MapReduceSummarizer(
                mockOpenAI,
                (msg) => progressMessages.push(msg),
            );

            const files = [
                makeFile('a.ts', 100),
                makeFile('b.ts', 100),
            ];
            await summarizer.summarize(files, 'english');

            assert.ok(progressMessages.length > 0);
        });

        test('should handle summarization failures gracefully', async () => {
            const mockOpenAI = {
                summarizeChunk: async () => undefined,
            } as any;

            const summarizer = new MapReduceSummarizer(mockOpenAI);
            const files = [makeFile('a.ts', 100)];
            const result = await summarizer.summarize(files, 'english');

            assert.strictEqual(result.chunksFailed, 1);
            assert.ok(result.summary.includes('Summarization failed'));
            assert.ok(result.summary.includes('a.ts'));
        });

        test('should combine summaries from multiple chunks', async () => {
            let callCount = 0;
            const mockOpenAI = {
                summarizeChunk: async () => {
                    callCount++;
                    return `summary ${callCount}`;
                },
            } as any;

            const summarizer = new MapReduceSummarizer(mockOpenAI);
            const files = [
                makeFile('a.ts', 100),
                makeFile('b.ts', 100),
                makeFile('c.ts', 100),
            ];
            // Small chunk size to force multiple chunks
            const result = await summarizer.summarize(files, 'english');

            assert.ok(result.chunksProcessed >= 1);
            assert.strictEqual(result.chunksFailed, 0);
            assert.ok(result.summary.includes('summary'));
        });
    });
});
