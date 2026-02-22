import { FilePriority, classifyFilePriority } from '../constants/diffClassification';
import { AssembledDiffResult, ParsedFileDiff } from './diff.types';
import { estimateTokenCount } from './diff.truncate';

export function parseDiffIntoFiles(rawDiff: string): ParsedFileDiff[] {
    if (!rawDiff || rawDiff.trim() === '') {
        return [];
    }

    const headerRegex = /^diff --git a\/(.+?) b\/.+$/gm;
    const positions: { index: number; filePath: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(rawDiff)) !== null) {
        positions.push({ index: match.index, filePath: match[1] });
    }

    if (positions.length === 0) {
        return [];
    }

    return positions.map((pos, i) => {
        const endIndex = i + 1 < positions.length ? positions[i + 1].index : rawDiff.length;
        const content = rawDiff.substring(pos.index, endIndex);

        let additions = 0;
        let deletions = 0;
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
                additions++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
                deletions++;
            }
        }

        return {
            filePath: pos.filePath,
            content,
            additions,
            deletions,
            tokenCount: estimateTokenCount(content),
            priority: classifyFilePriority(pos.filePath),
        };
    });
}

export function buildChangeSummaryHeader(files: ParsedFileDiff[]): string {
    const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
    const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

    const lines: string[] = [
        `## Change Summary (${files.length} files, +${totalAdditions}/-${totalDeletions})`,
        '',
    ];

    for (const file of files) {
        const priorityLabel =
            file.priority === FilePriority.EXCLUDE
                ? ' [LOCK]'
                : file.priority === FilePriority.LOW
                  ? ' [generated]'
                  : '';
        lines.push(`- ${file.filePath} (+${file.additions}/-${file.deletions})${priorityLabel}`);
    }

    lines.push('');
    return lines.join('\n');
}

export function assemblePrioritizedDiff(
    files: ParsedFileDiff[],
    summaryHeader: string,
    tokenBudget: number,
): AssembledDiffResult {
    const summaryTokens = estimateTokenCount(summaryHeader);
    let remainingBudget = tokenBudget - summaryTokens;

    const sortedFiles = [...files]
        .filter((f) => f.priority !== FilePriority.EXCLUDE)
        .sort((a, b) => b.priority - a.priority);

    const includedDiffs: string[] = [];
    const overflowFiles: ParsedFileDiff[] = [];
    let includedCount = 0;

    for (const file of sortedFiles) {
        if (file.tokenCount <= remainingBudget) {
            includedDiffs.push(file.content);
            remainingBudget -= file.tokenCount;
            includedCount++;
        } else {
            overflowFiles.push(file);
        }
    }

    const excludedCount = files.filter((f) => f.priority === FilePriority.EXCLUDE).length;
    const summaryOnlyCount = overflowFiles.length + excludedCount;

    return {
        content: summaryHeader + includedDiffs.join(''),
        includedCount,
        summaryOnlyCount,
        overflowFiles,
    };
}
