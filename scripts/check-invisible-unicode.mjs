#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    formatFinding,
    scanTextForEscapedPayloads,
    scanTextForInvisibleUnicode,
} from './lib/invisible-unicode.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BINARY_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.webp',
    '.bmp',
    '.wav',
    '.mp3',
    '.ogg',
    '.mp4',
    '.ttf',
    '.otf',
    '.woff',
    '.woff2',
    '.zip',
    '.vsix',
    '.gz',
    '.pdf',
    '.exe',
    '.dll',
    '.pfx',
    '.p12',
]);
// The bundle is the only file under out/ that .vscodeignore lets into the VSIX.
// The release workflow also scans the unpacked VSIX itself (`--dist <dir>`).
const DIST_BUNDLE = 'out/extension.js';
const DIST_FILES = ['package.json', 'README.md', 'CHANGELOG.md', 'LICENSE'];
const ESCAPE_SCAN_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json']);
const KNOWN_FLAGS = new Set(['--dist']);
const MAX_FINDINGS_PRINTED_PER_FILE = 20;
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

function listCandidateFiles() {
    const stdout = execFileSync(
        'git',
        ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
    );
    return [...new Set(stdout.split('\0').filter(Boolean))];
}

function walkDirectory(absoluteDirectory, predicate, collected) {
    for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
        const absolutePath = path.join(absoluteDirectory, entry.name);
        if (entry.isSymbolicLink()) {
            continue;
        }
        if (entry.isDirectory()) {
            walkDirectory(absolutePath, predicate, collected);
        } else if (entry.isFile() && predicate(absolutePath)) {
            collected.push(path.relative(repoRoot, absolutePath).split(path.sep).join('/'));
        }
    }
    return collected;
}

function listDistFiles() {
    if (!fs.existsSync(path.join(repoRoot, DIST_BUNDLE))) {
        throw new Error(
            `${DIST_BUNDLE} does not exist - run "npm run vscode:prepublish" before scanning artifacts.`,
        );
    }
    const collected = [DIST_BUNDLE];
    for (const file of DIST_FILES) {
        if (fs.existsSync(path.join(repoRoot, file))) {
            collected.push(file);
        }
    }
    for (const entry of fs.readdirSync(repoRoot)) {
        if (/^package\.nls.*\.json$/.test(entry)) {
            collected.push(entry);
        }
    }
    return collected;
}

function listExplicitTargets(targets) {
    const collected = [];
    for (const target of targets) {
        const absolutePath = path.resolve(repoRoot, target);
        const stat = fs.statSync(absolutePath);
        if (stat.isDirectory()) {
            walkDirectory(absolutePath, () => true, collected);
        } else {
            collected.push(path.relative(repoRoot, absolutePath).split(path.sep).join('/'));
        }
    }
    return collected;
}

/**
 * Scan files as UTF-8 text. Only files with a known binary extension are skipped:
 * a NUL byte is reported like any other control character, and a file that is not
 * valid UTF-8 or cannot be read is an error, so neither can hide a payload.
 * Files listed by git but deleted from the working tree are counted as missing.
 */
function scanFiles(relativePaths, { escapes }) {
    const findings = [];
    const errors = [];
    let scanned = 0;
    let skipped = 0;
    let missing = 0;

    for (const relativePath of relativePaths) {
        if (BINARY_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) {
            skipped += 1;
            continue;
        }

        let text;
        try {
            text = utf8.decode(fs.readFileSync(path.join(repoRoot, relativePath)));
        } catch (error) {
            if (error?.code === 'ENOENT') {
                missing += 1;
            } else {
                errors.push(
                    `${relativePath}: ${error instanceof TypeError ? 'not valid UTF-8' : error.message}`,
                );
            }
            continue;
        }

        scanned += 1;
        for (const finding of scanTextForInvisibleUnicode(text)) {
            findings.push({ relativePath, finding });
        }
        if (escapes && ESCAPE_SCAN_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) {
            for (const finding of scanTextForEscapedPayloads(text)) {
                findings.push({ relativePath, finding });
            }
        }
    }
    return { findings, errors, scanned, skipped, missing };
}

function printFindings(findings) {
    const perFile = new Map();
    for (const { relativePath, finding } of findings) {
        const printed = perFile.get(relativePath) ?? 0;
        if (printed < MAX_FINDINGS_PRINTED_PER_FILE) {
            console.error(`  ${formatFinding(finding, relativePath)}`);
        } else if (printed === MAX_FINDINGS_PRINTED_PER_FILE) {
            const total = findings.filter((item) => item.relativePath === relativePath).length;
            console.error(`  ${relativePath}: ... ${total - printed} more occurrence(s)`);
        }
        perFile.set(relativePath, printed + 1);
    }
}

function main(arguments_) {
    const unknownFlags = arguments_.filter(
        (argument) => argument.startsWith('--') && !KNOWN_FLAGS.has(argument),
    );
    if (unknownFlags.length > 0) {
        console.error(
            `Unknown option(s): ${unknownFlags.join(', ')}\n` +
                'Usage: check-invisible-unicode.mjs [--dist] [path ...]',
        );
        return 2;
    }
    const explicitTargets = arguments_.filter((argument) => !argument.startsWith('--'));
    const distMode = arguments_.includes('--dist');
    let mode;
    let targets;

    if (explicitTargets.length > 0) {
        mode = distMode ? 'shipped artifacts (explicit paths)' : 'explicit paths';
        targets = listExplicitTargets(explicitTargets);
    } else if (distMode) {
        mode = 'shipped artifacts';
        targets = listDistFiles();
    } else {
        mode = 'repository files';
        targets = listCandidateFiles();
    }

    const { findings, errors, scanned, skipped, missing } = scanFiles(targets, {
        escapes: distMode,
    });
    if (errors.length > 0) {
        console.error(`Files that could not be scanned as UTF-8 text in ${mode}:\n`);
        for (const error of errors) {
            console.error(`  ${error}`);
        }
        console.error('');
    }
    if (findings.length > 0) {
        console.error(`Invisible Unicode characters detected in ${mode}:\n`);
        printFindings(findings);
        console.error(
            `\n${findings.length} occurrence(s) in ${new Set(findings.map((item) => item.relativePath)).size} file(s).` +
                '\nInvisible characters can hide executable code from review (GlassWorm, Trojan Source).' +
                '\nRemove them, or document a narrowly-scoped exemption in scripts/lib/invisible-unicode.mjs.',
        );
        return 1;
    }
    if (errors.length > 0) {
        return 1;
    }

    console.log(
        `No invisible Unicode characters found (${mode}: ${scanned} scanned, ` +
            `${skipped} skipped as binary, ${missing} missing from the working tree).`,
    );
    return 0;
}

process.exitCode = main(process.argv.slice(2));
