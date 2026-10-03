import { suite, test } from 'mocha';
import * as assert from 'assert';
import { MapReduceSummarizer } from '../mapReduceSummarizer';
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
    suite('MapReduceSummarizer', () => {
        test('should report progress for each chunk', async () => {
            const progressMessages: string[] = [];
            const mockOpenAI = {
                summarizeChunk: async () => 'chunk summary',
            } as any;

            const summarizer = new MapReduceSummarizer(mockOpenAI, (msg) =>
                progressMessages.push(msg),
            );

            const files = [makeFile('a.ts', 100), makeFile('b.ts', 100)];
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
            const files = [makeFile('a.ts', 100), makeFile('b.ts', 100), makeFile('c.ts', 100)];
            // Small chunk size to force multiple chunks
            const result = await summarizer.summarize(files, 'english');

            assert.ok(result.chunksProcessed >= 1);
            assert.strictEqual(result.chunksFailed, 0);
            assert.ok(result.summary.includes('summary'));
        });

        test('should rethrow aborts instead of returning a partial summary', async () => {
            const controller = new AbortController();
            let callCount = 0;
            const mockOpenAI = {
                summarizeChunk: async () => {
                    callCount++;
                    controller.abort();
                    const error = new Error('The operation was aborted');
                    error.name = 'AbortError';
                    throw error;
                },
            } as any;

            const summarizer = new MapReduceSummarizer(mockOpenAI);
            const files = [
                makeFile('a.ts', 80_001),
                makeFile('b.ts', 80_001),
                makeFile('c.ts', 80_001),
                makeFile('d.ts', 80_001),
            ];

            await assert.rejects(
                summarizer.summarize(files, 'english', controller.signal),
                (error: unknown) => error instanceof Error && error.name === 'AbortError',
            );
            assert.strictEqual(
                callCount,
                3,
                'the next batch must never start after the active batch aborts',
            );
        });
    });
});
