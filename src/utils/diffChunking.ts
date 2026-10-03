/**
 * Chunking of parsed file diffs for Tier 3 map-reduce summarization.
 *
 * Invariant: every chunk produced by {@link groupIntoChunks} fits within the
 * chunk token limit, including chunks cut from a single oversized file, as
 * long as the limit leaves room for a part label (real limits are 80K tokens).
 */

import { CHARS_PER_TOKEN } from '../constants/tokenLimits';
import { ParsedFileDiff } from './diff.types';
import { estimateTokenCount } from './diff.truncate';

/**
 * Split text into pieces of at most `maxChars` characters, cutting at line
 * ends where possible and inside a line only when the line alone is too long.
 *
 * @param text - Text to split
 * @param maxChars - Maximum characters per piece (at least 1)
 * @returns The pieces, in order; joining them restores the text
 */
export function splitAtLineBoundaries(text: string, maxChars: number): string[] {
    const limit = Math.max(1, Math.floor(maxChars));
    const pieces: string[] = [];
    let current = '';

    for (const line of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
        if (current.length + line.length <= limit) {
            current += line;
            continue;
        }
        if (current) {
            pieces.push(current);
            current = '';
        }
        let rest = line;
        while (rest.length > limit) {
            pieces.push(rest.slice(0, limit));
            rest = rest.slice(limit);
        }
        current = rest;
    }

    if (current) {
        pieces.push(current);
    }
    return pieces;
}

function countChangedLines(content: string): { additions: number; deletions: number } {
    let additions = 0;
    let deletions = 0;
    for (const line of content.split('\n')) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
            deletions++;
        }
    }
    return { additions, deletions };
}

/**
 * Cut a file diff that exceeds the chunk limit into labelled parts that each
 * fit, so no summarization request is sent above the limit.
 *
 * Each part starts with a `# <path> (part i/n)` line so the model knows which
 * file a continuation belongs to.
 *
 * @param file - The parsed file diff
 * @param chunkTokenLimit - Maximum tokens per chunk
 * @returns The file itself when it fits, otherwise its parts in order
 */
export function splitOversizedFile(
    file: ParsedFileDiff,
    chunkTokenLimit: number,
): ParsedFileDiff[] {
    if (file.tokenCount <= chunkTokenLimit) {
        return [file];
    }

    // Reserve room for the widest label so labelled parts still fit
    const widestLabel = `# ${file.filePath} (part 99999/99999)\n`;
    const bodyChars = chunkTokenLimit * CHARS_PER_TOKEN - widestLabel.length;
    const bodies = splitAtLineBoundaries(file.content, bodyChars);

    return bodies.map((body, index) => {
        const label = `${file.filePath} (part ${index + 1}/${bodies.length})`;
        const content = `# ${label}\n${body}`;
        return {
            ...file,
            ...countChangedLines(body),
            filePath: label,
            content,
            tokenCount: estimateTokenCount(content),
        };
    });
}

/**
 * Group parsed file diffs into chunks that fit within a token limit
 *
 * Files are kept whole when they fit; a file larger than the limit is first
 * cut into parts with {@link splitOversizedFile}.
 *
 * @param files - Files to group into chunks
 * @param chunkTokenLimit - Maximum tokens per chunk
 * @returns Array of chunks, each containing one or more files or file parts
 */
export function groupIntoChunks(
    files: ParsedFileDiff[],
    chunkTokenLimit: number,
): ParsedFileDiff[][] {
    const chunks: ParsedFileDiff[][] = [];
    let currentChunk: ParsedFileDiff[] = [];
    let currentTokens = 0;

    for (const file of files.flatMap((f) => splitOversizedFile(f, chunkTokenLimit))) {
        if (currentChunk.length > 0 && currentTokens + file.tokenCount > chunkTokenLimit) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentTokens = 0;
        }
        currentChunk.push(file);
        currentTokens += file.tokenCount;
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}
