import * as assert from 'assert';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';

interface InvisibleUnicodeFinding {
    index: number;
    line: number;
    column: number;
    codePoint: number;
    escape: string;
    categoryId: string;
    label: string;
    reason: string;
}

type ScanFunction = (
    text: string,
    options?: { allowEmojiPresentation?: boolean },
) => InvisibleUnicodeFinding[];

interface DetectorModule {
    scanTextForInvisibleUnicode: ScanFunction;
    scanTextForEscapedPayloads: (text: string) => InvisibleUnicodeFinding[];
    formatFinding: (finding: InvisibleUnicodeFinding, filePath: string) => string;
}

const importEsm = new Function('specifier', 'return import(specifier);') as (
    specifier: string,
) => Promise<DetectorModule>;
const codePoints = (...values: number[]): string => String.fromCodePoint(...values);
const repoRoot = path.resolve(__dirname, '../../..');
const scannerPath = path.join(repoRoot, 'scripts', 'check-invisible-unicode.mjs');

const ZERO_WIDTH_SPACE = 0x200b;
const VARIATION_SELECTOR_16 = 0xfe0f;
const BYTE_ORDER_MARK = 0xfeff;
const CHECK_MARK = 0x2705;
const GRINNING_FACE = 0x1f600;
const COMBINING_KEYCAP = 0x20e3;
// Escape sequences are assembled at runtime so this file holds no literal escape text.
const BACKSLASH = String.fromCharCode(92);
const braceEscape = (hex: string): string => `${BACKSLASH}u{${hex}}`;
const unitEscape = (hex: string): string => `${BACKSLASH}u${hex}`;

suite('Invisible Unicode detector (GlassWorm)', () => {
    let scanTextForInvisibleUnicode: ScanFunction;
    let scanTextForEscapedPayloads: DetectorModule['scanTextForEscapedPayloads'];
    let formatFinding: DetectorModule['formatFinding'];

    suiteSetup(async () => {
        const detector = await importEsm(
            pathToFileURL(path.join(repoRoot, 'scripts', 'lib', 'invisible-unicode.mjs')).href,
        );
        scanTextForInvisibleUnicode = detector.scanTextForInvisibleUnicode;
        scanTextForEscapedPayloads = detector.scanTextForEscapedPayloads;
        formatFinding = detector.formatFinding;
    });

    test('detects blank-rendering identifier characters and private use code points', () => {
        const cases: Array<[number, string]> = [
            [0x115f, 'hangul-filler'],
            [0x3164, 'hangul-filler'],
            [0xffa0, 'hangul-filler'],
            [0x034f, 'combining-grapheme-joiner'],
            [0x17b4, 'khmer-inherent-vowel'],
            [0x2800, 'braille-blank'],
            [0x206a, 'deprecated-format'],
            [0x1d173, 'musical-format'],
            [0xe000, 'private-use'],
            [0xf0000, 'private-use'],
            [0xe0080, 'special-purpose-unassigned'],
            [0xe01f0, 'special-purpose-unassigned'],
        ];
        for (const [codePoint, categoryId] of cases) {
            const findings = scanTextForInvisibleUnicode(`const a${codePoints(codePoint)}b = 1;`);
            assert.deepStrictEqual(
                findings.map((finding) => finding.categoryId),
                [categoryId],
                codePoint.toString(16),
            );
        }
    });

    test('detects escaped payload code points, including surrogate pairs', () => {
        const payload = [
            braceEscape('E0100'),
            braceEscape('E0041'),
            unitEscape('DB40'),
            unitEscape('DD01'),
        ].join('');
        const findings = scanTextForEscapedPayloads(`a = 1;\nconsole.log("x${payload}");`);
        assert.deepStrictEqual(
            findings.map((finding) => [finding.escape, finding.line, finding.column]),
            [
                ['U+E0100', 2, 15],
                ['U+E0041', 2, 24],
                ['U+E0101', 2, 33],
            ],
        );
        assert.strictEqual(findings[0].label, 'escaped variation selector supplement');
    });

    test('flags escaped BMP variation selectors only in runs of three or more', () => {
        const regex = `/[${unitEscape('180B')}-${unitEscape('180D')}${unitEscape('FE00')}-${unitEscape('FE0F')}]/;`;
        const emojiPair = `"${unitEscape('FE0E')}${unitEscape('FE0F')}"`;
        assert.deepStrictEqual(scanTextForEscapedPayloads(regex + emojiPair), []);
        const run = `"${unitEscape('FE00')}${unitEscape('FE01')}${braceEscape('FE02')}"`;
        assert.deepStrictEqual(
            scanTextForEscapedPayloads(run).map((finding) => finding.escape),
            ['U+FE00', 'U+FE01', 'U+FE02'],
        );
    });

    test('accepts ordinary and visible non-ASCII text', () => {
        const source = 'const proxyUrl = "http://proxy.example.com:8080";\n\t// 日本語 العربية\r\n';
        assert.deepStrictEqual(scanTextForInvisibleUnicode(source), []);
    });

    test('detects Unicode tag characters', () => {
        const findings = scanTextForInvisibleUnicode(`const a = 1;${codePoints(0xe0041)}`);
        assert.strictEqual(findings.length, 1);
        assert.strictEqual(findings[0].categoryId, 'tag');
        assert.strictEqual(findings[0].escape, 'U+E0041');
    });

    test('detects variation selector supplement payloads', () => {
        const findings = scanTextForInvisibleUnicode(
            `const a = 1;${codePoints(0xe0100, 0xe0101, 0xe0102)}`,
        );
        assert.strictEqual(findings.length, 3);
        assert.ok(
            findings.every((finding) => finding.categoryId === 'variation-selector-supplement'),
        );
    });

    test('detects zero-width, bidi, separator, annotation, and control categories', () => {
        const cases: Array<[number, string]> = [
            [0x200b, 'zero-width'],
            [0x200d, 'zero-width'],
            [0x202e, 'bidi-control'],
            [0x2066, 'bidi-isolate'],
            [0x200e, 'directional-mark'],
            [0x061c, 'arabic-letter-mark'],
            [0x2060, 'invisible-operator'],
            [0x2028, 'line-separator'],
            [0x00ad, 'soft-hyphen'],
            [0x180e, 'mongolian-format'],
            [0xfff9, 'interlinear-annotation'],
            [0x0085, 'c1-control'],
            [0x0001, 'c0-control'],
            [0x007f, 'delete-control'],
        ];

        for (const [codePoint, expectedCategory] of cases) {
            const findings = scanTextForInvisibleUnicode(`x${codePoints(codePoint)}y`);
            assert.strictEqual(findings.length, 1, expectedCategory);
            assert.strictEqual(findings[0].categoryId, expectedCategory);
            assert.strictEqual(findings[0].codePoint, codePoint);
        }
    });

    test('allows tab, LF, and CR', () => {
        assert.deepStrictEqual(scanTextForInvisibleUnicode('a\tb\r\nc'), []);
    });

    test('allows one emoji presentation selector after an emoji or keycap base', () => {
        assert.deepStrictEqual(
            scanTextForInvisibleUnicode(`- ${codePoints(CHECK_MARK, VARIATION_SELECTOR_16)} done`),
            [],
        );
        assert.deepStrictEqual(
            scanTextForInvisibleUnicode(`1${codePoints(VARIATION_SELECTOR_16, COMBINING_KEYCAP)}`),
            [],
        );
    });

    test('flags an unbased presentation selector and selector runs', () => {
        assert.strictEqual(
            scanTextForInvisibleUnicode(`token${codePoints(VARIATION_SELECTOR_16)}`).length,
            1,
        );
        const run = scanTextForInvisibleUnicode(
            codePoints(
                CHECK_MARK,
                VARIATION_SELECTOR_16,
                VARIATION_SELECTOR_16,
                VARIATION_SELECTOR_16,
            ),
        );
        assert.strictEqual(run.length, 2);
    });

    test('supports strict emoji-presentation scanning', () => {
        const findings = scanTextForInvisibleUnicode(
            codePoints(CHECK_MARK, VARIATION_SELECTOR_16),
            { allowEmojiPresentation: false },
        );
        assert.strictEqual(findings.length, 1);
    });

    test('allows a BOM only at offset zero', () => {
        assert.deepStrictEqual(
            scanTextForInvisibleUnicode(`${codePoints(BYTE_ORDER_MARK)}const a = 1;`),
            [],
        );
        assert.strictEqual(
            scanTextForInvisibleUnicode(`const a${codePoints(BYTE_ORDER_MARK)} = 1;`)[0].categoryId,
            'byte-order-mark',
        );
    });

    test('reports UTF-16 line, column, and clickable formatting', () => {
        const [finding] = scanTextForInvisibleUnicode(
            `line one\n${codePoints(GRINNING_FACE)}${codePoints(ZERO_WIDTH_SPACE)}`,
        );
        assert.strictEqual(finding.line, 2);
        assert.strictEqual(finding.column, 3);
        const formatted = formatFinding(finding, 'src/extension.ts');
        assert.ok(formatted.startsWith('src/extension.ts:2:3'), formatted);
        assert.ok(formatted.includes('U+200B'), formatted);
    });
});

suite('Invisible Unicode repository scanner', () => {
    let temporaryDirectory: string;

    setup(() => {
        temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'otak-unicode-'));
    });

    teardown(() => {
        fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    });

    test('returns success for a clean explicit file', () => {
        const cleanPath = path.join(temporaryDirectory, 'clean.ts');
        fs.writeFileSync(cleanPath, 'export const visible = "日本語";\n');
        const result = spawnSync(process.execPath, [scannerPath, cleanPath], {
            cwd: repoRoot,
            encoding: 'utf8',
        });
        assert.strictEqual(result.status, 0, result.stderr);
        assert.match(result.stdout, /No invisible Unicode characters found/);
    });

    test('returns failure and a location for a smuggled explicit file', () => {
        const maliciousPath = path.join(temporaryDirectory, 'smuggled.ts');
        fs.writeFileSync(maliciousPath, `export const value = 1;${codePoints(0xe0041)}\n`);
        const result = spawnSync(process.execPath, [scannerPath, maliciousPath], {
            cwd: repoRoot,
            encoding: 'utf8',
        });
        assert.strictEqual(result.status, 1, result.stdout);
        assert.match(result.stderr, /U\+E0041/);
        assert.match(result.stderr, /smuggled\.ts:1:24/);
    });

    const runScanner = (...args: string[]) =>
        spawnSync(process.execPath, [scannerPath, ...args], { cwd: repoRoot, encoding: 'utf8' });

    test('scans a source file containing a NUL byte instead of skipping it', () => {
        const nulPath = path.join(temporaryDirectory, 'nul.ts');
        fs.writeFileSync(nulPath, `const a = 1;//${codePoints(0, 0xe0100)}\n`);
        const result = runScanner(nulPath);
        assert.strictEqual(result.status, 1, result.stdout);
        assert.match(result.stderr, /nul\.ts:1:15 {2}U\+0000/);
        assert.match(result.stderr, /U\+E0100/);
    });

    test('fails on a text file that is not valid UTF-8', () => {
        const invalidPath = path.join(temporaryDirectory, 'invalid.md');
        fs.writeFileSync(invalidPath, Buffer.from([0x78, 0xff, 0xfe, 0x0a]));
        const result = runScanner(invalidPath);
        assert.strictEqual(result.status, 1, result.stdout);
        assert.match(result.stderr, /invalid\.md: not valid UTF-8/);
    });

    test('checks escape sequences only in shipped-artifact mode', () => {
        const bundlePath = path.join(temporaryDirectory, 'bundle.js');
        const payload = braceEscape('E0100') + braceEscape('E0101');
        fs.writeFileSync(bundlePath, `console.log("x${payload}");\n`);
        const sourceMode = runScanner(bundlePath);
        assert.strictEqual(sourceMode.status, 0, sourceMode.stderr);
        const artifactMode = runScanner('--dist', bundlePath);
        assert.strictEqual(artifactMode.status, 1, artifactMode.stdout);
        assert.match(
            artifactMode.stderr,
            /bundle\.js:1:15 {2}U\+E0100 \(escaped variation selector supplement\)/,
        );
    });

    test('rejects an unknown option with exit code 2', () => {
        const result = runScanner('--dsit');
        assert.strictEqual(result.status, 2, result.stdout);
        assert.match(result.stderr, /Unknown option\(s\): --dsit/);
    });
});
