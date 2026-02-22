import * as path from 'path';
import { FileCategories, StatusFile } from './diff.types';

const RESERVED_NAMES = [
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'COM2',
    'COM3',
    'COM4',
    'COM5',
    'COM6',
    'COM7',
    'COM8',
    'COM9',
    'LPT1',
    'LPT2',
    'LPT3',
    'LPT4',
    'LPT5',
    'LPT6',
    'LPT7',
    'LPT8',
    'LPT9',
];

export function isWindowsReservedName(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const nameWithoutExt = fileName.split('.')[0];
    return RESERVED_NAMES.some((reserved) => nameWithoutExt.toUpperCase() === reserved);
}

export function categorizeFiles(files: StatusFile[]): FileCategories {
    const categories: FileCategories = {
        added: [],
        modified: [],
        deleted: [],
        renamed: [],
        binary: [],
    };

    for (const file of files) {
        const index = file.index;
        const filePath = file.path;

        if (index === 'R' || filePath.includes(' -> ')) {
            const parts = filePath.split(' -> ');
            if (parts.length === 2) {
                categories.renamed.push({
                    from: parts[0].trim(),
                    to: parts[1].trim(),
                });
            }
            continue;
        }

        if (index === 'A' || index === '?') {
            categories.added.push(filePath);
            continue;
        }

        if (index === 'D') {
            categories.deleted.push(filePath);
            continue;
        }

        if (index === 'M') {
            categories.modified.push(filePath);
            continue;
        }

        if (file.working_dir === '?' || file.working_dir === 'A') {
            categories.added.push(filePath);
        } else if (file.working_dir === 'M') {
            categories.modified.push(filePath);
        } else if (file.working_dir === 'D') {
            categories.deleted.push(filePath);
        }
    }

    return categories;
}

export function generateFileSummary(categories: FileCategories): string {
    const sections: string[] = [];

    if (categories.added.length > 0) {
        sections.push(
            `Added (${categories.added.length} files):\n${categories.added.map((f) => `  - ${f}`).join('\n')}`,
        );
    }

    if (categories.modified.length > 0) {
        sections.push(
            `Modified (${categories.modified.length} files):\n${categories.modified.map((f) => `  - ${f}`).join('\n')}`,
        );
    }

    if (categories.deleted.length > 0) {
        sections.push(
            `Deleted (${categories.deleted.length} files):\n${categories.deleted.map((f) => `  - ${f}`).join('\n')}`,
        );
    }

    if (categories.renamed.length > 0) {
        sections.push(
            `Renamed (${categories.renamed.length} files):\n${categories.renamed.map((r) => `  - ${r.from} -> ${r.to}`).join('\n')}`,
        );
    }

    if (categories.binary.length > 0) {
        sections.push(
            `Binary (${categories.binary.length} files):\n${categories.binary.map((f) => `  - ${f}`).join('\n')}`,
        );
    }

    return sections.join('\n\n');
}

export function detectReservedFiles(files: string[]): string[] {
    return files.filter(isWindowsReservedName);
}
