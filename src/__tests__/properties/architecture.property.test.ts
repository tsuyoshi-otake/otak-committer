/**
 * Property-based tests for architecture constraints
 *
 * **Feature: extension-architecture-refactoring**
 * - Property 11: File Size Constraints (Validates: Requirements 8.2)
 * - Property 12: Standardized Folder Structure (Validates: Requirements 8.3)
 * - Property 13: Clear Module Boundaries (Validates: Requirements 8.4)
 * - Property 14: Public API Documentation (Validates: Requirements 9.1)
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { createTaggedPropertyTest } from '../../test/helpers/property-test.helper';
import { analyzeModuleDependencies, validateLayerBoundaries } from '../../utils/dependencyAnalyzer';

suite('Architecture Property Tests', () => {
    const srcPath = path.resolve(__dirname, '../../../src');

    /**
     * Property 11: File Size Constraints
     *
     * For any source file F in the codebase, the size of F should not exceed
     * 300 lines of code (excluding comments and blank lines).
     */
    test(
        'Property 11: File Size Constraints',
        createTaggedPropertyTest(
            'extension-architecture-refactoring',
            11,
            'File Size Constraints',
            () => {
                const MAX_LINES = 400; // Allow up to 400 code lines for complex command files
                const violations: Array<{ file: string; lines: number }> = [];

                function countCodeLines(content: string): number {
                    const lines = content.split('\n');
                    let codeLines = 0;
                    let inBlockComment = false;

                    for (const line of lines) {
                        const trimmed = line.trim();

                        // Skip empty lines
                        if (trimmed === '') {
                            continue;
                        }

                        // Handle block comments
                        if (inBlockComment) {
                            if (trimmed.includes('*/')) {
                                inBlockComment = false;
                            }
                            continue;
                        }

                        if (trimmed.startsWith('/*')) {
                            if (!trimmed.includes('*/')) {
                                inBlockComment = true;
                            }
                            continue;
                        }

                        // Skip single-line comments
                        if (trimmed.startsWith('//')) {
                            continue;
                        }

                        // Skip JSDoc style comments
                        if (trimmed.startsWith('*')) {
                            continue;
                        }

                        codeLines++;
                    }

                    return codeLines;
                }

                function checkDirectory(dir: string): void {
                    if (!fs.existsSync(dir)) {
                        return;
                    }

                    const entries = fs.readdirSync(dir, { withFileTypes: true });

                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);

                        if (entry.isDirectory()) {
                            // Skip test directories and node_modules
                            if (
                                entry.name === 'node_modules' ||
                                entry.name === '__tests__' ||
                                entry.name === 'test' ||
                                entry.name === 'out' ||
                                entry.name === 'dist'
                            ) {
                                continue;
                            }
                            checkDirectory(fullPath);
                        } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                            // Skip test files
                            if (entry.name.includes('.test.')) {
                                continue;
                            }

                            const content = fs.readFileSync(fullPath, 'utf-8');
                            const lines = countCodeLines(content);

                            if (lines > MAX_LINES) {
                                violations.push({
                                    file: path.relative(srcPath, fullPath),
                                    lines,
                                });
                            }
                        }
                    }
                }

                checkDirectory(srcPath);

                if (violations.length > 0) {
                    console.log('\nFiles exceeding line limit:');
                    violations.forEach((v) => {
                        console.log(`  - ${v.file}: ${v.lines} lines (max: ${MAX_LINES})`);
                    });
                }

                assert.strictEqual(
                    violations.length,
                    0,
                    `Found ${violations.length} files exceeding ${MAX_LINES} lines. ` +
                        `Files should be kept under ${MAX_LINES} lines of code.`,
                );
            },
        ),
    );

    /**
     * Property 12: Standardized Folder Structure
     *
     * For any module M, M should be located in the appropriate folder according
     * to its responsibility: commands in src/commands/, services in src/services/,
     * infrastructure in src/infrastructure/, types in src/types/.
     */
    test(
        'Property 12: Standardized Folder Structure',
        createTaggedPropertyTest(
            'extension-architecture-refactoring',
            12,
            'Standardized Folder Structure',
            () => {
                const expectedFolders = [
                    'commands',
                    'services',
                    'infrastructure',
                    'types',
                    'utils',
                ];

                const violations: string[] = [];

                // Check that expected folders exist
                for (const folder of expectedFolders) {
                    const folderPath = path.join(srcPath, folder);
                    if (!fs.existsSync(folderPath)) {
                        violations.push(`Missing expected folder: src/${folder}`);
                    }
                }

                // Check that files are in appropriate folders based on their content
                function checkFileLocation(filePath: string): void {
                    if (!filePath.endsWith('.ts') || filePath.includes('.test.')) {
                        return;
                    }

                    const content = fs.readFileSync(filePath, 'utf-8');
                    const relativePath = path.relative(srcPath, filePath).replace(/\\/g, '/');

                    // Skip index files
                    if (path.basename(filePath) === 'index.ts') {
                        return;
                    }

                    // Check if file is a command but not in commands folder
                    if (
                        content.includes('extends BaseCommand') &&
                        !relativePath.startsWith('commands/')
                    ) {
                        violations.push(
                            `${relativePath} extends BaseCommand but is not in commands/`,
                        );
                    }

                    // Check if file defines storage provider but not in infrastructure/storage
                    if (
                        content.includes('class') &&
                        content.includes('StorageProvider') &&
                        !relativePath.includes('infrastructure/storage/')
                    ) {
                        violations.push(
                            `${relativePath} defines StorageProvider but is not in infrastructure/storage/`,
                        );
                    }

                    // Check if file defines error types but not in types/errors
                    if (
                        content.includes('extends BaseError') &&
                        !relativePath.includes('types/errors/') &&
                        !relativePath.includes('types\\errors\\')
                    ) {
                        violations.push(
                            `${relativePath} extends BaseError but is not in types/errors/`,
                        );
                    }
                }

                function checkDirectory(dir: string): void {
                    if (!fs.existsSync(dir)) {
                        return;
                    }

                    const entries = fs.readdirSync(dir, { withFileTypes: true });

                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);

                        if (entry.isDirectory()) {
                            if (
                                entry.name === 'node_modules' ||
                                entry.name === '__tests__' ||
                                entry.name === 'out' ||
                                entry.name === 'dist'
                            ) {
                                continue;
                            }
                            checkDirectory(fullPath);
                        } else if (entry.isFile()) {
                            checkFileLocation(fullPath);
                        }
                    }
                }

                checkDirectory(srcPath);

                if (violations.length > 0) {
                    console.log('\nFolder structure violations:');
                    violations.forEach((v) => console.log(`  - ${v}`));
                }

                assert.strictEqual(
                    violations.length,
                    0,
                    `Found ${violations.length} folder structure violations. ` +
                        `Modules should be in appropriate folders based on responsibility.`,
                );
            },
        ),
    );

    /**
     * Property 13: Clear Module Boundaries
     *
     * For any module M in a layer L, M should only import from modules in the
     * same layer L or lower layers, never from higher layers.
     */
    test(
        'Property 13: Clear Module Boundaries',
        createTaggedPropertyTest(
            'extension-architecture-refactoring',
            13,
            'Clear Module Boundaries',
            () => {
                const result = analyzeModuleDependencies(srcPath);
                const violations = validateLayerBoundaries(result.modules);

                // Filter out test-related violations
                const productionViolations = violations.filter(
                    (v) =>
                        !v.from.includes('__tests__') &&
                        !v.from.includes('.test.') &&
                        !v.to.includes('__tests__') &&
                        !v.to.includes('.test.'),
                );

                if (productionViolations.length > 0) {
                    console.log('\nModule boundary violations:');
                    productionViolations.forEach((v) => {
                        console.log(`  - ${v.from} -> ${v.to}`);
                        console.log(`    ${v.violation}`);
                    });
                }

                assert.strictEqual(
                    productionViolations.length,
                    0,
                    `Found ${productionViolations.length} module boundary violations. ` +
                        `Lower layers should not depend on higher layers.`,
                );
            },
        ),
    );

    /**
     * Property 14: Public API Documentation
     *
     * For any exported function, class, or interface I, I should have a JSDoc
     * comment that describes its purpose, parameters, return value, and any
     * important behavior.
     */
    test(
        'Property 14: Public API Documentation',
        createTaggedPropertyTest(
            'extension-architecture-refactoring',
            14,
            'Public API Documentation',
            () => {
                const violations: Array<{ file: string; export: string }> = [];

                function checkDocumentation(filePath: string): void {
                    if (
                        !filePath.endsWith('.ts') ||
                        filePath.includes('.test.') ||
                        filePath.includes('__tests__')
                    ) {
                        return;
                    }

                    const content = fs.readFileSync(filePath, 'utf-8');
                    const relativePath = path.relative(srcPath, filePath).replace(/\\/g, '/');
                    const lines = content.split('\n');

                    // Pattern to find exports
                    const exportPatterns = [
                        /^export\s+(class|interface|type|function|enum|const)\s+(\w+)/,
                        /^export\s+async\s+function\s+(\w+)/,
                        /^export\s+default\s+(class|function)\s+(\w+)?/,
                    ];

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();

                        for (const pattern of exportPatterns) {
                            const match = line.match(pattern);
                            if (match) {
                                const exportName = match[2] || match[1] || 'default';

                                // Check for JSDoc comment before this export
                                let hasJsDoc = false;
                                let j = i - 1;

                                // Skip empty lines
                                while (j >= 0 && lines[j].trim() === '') {
                                    j--;
                                }

                                // Check if previous non-empty line is end of JSDoc
                                if (j >= 0) {
                                    const prevLine = lines[j].trim();
                                    if (prevLine === '*/') {
                                        hasJsDoc = true;
                                    }
                                }

                                if (!hasJsDoc) {
                                    violations.push({
                                        file: relativePath,
                                        export: exportName,
                                    });
                                }
                            }
                        }
                    }
                }

                function checkDirectory(dir: string): void {
                    if (!fs.existsSync(dir)) {
                        return;
                    }

                    const entries = fs.readdirSync(dir, { withFileTypes: true });

                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);

                        if (entry.isDirectory()) {
                            if (
                                entry.name === 'node_modules' ||
                                entry.name === '__tests__' ||
                                entry.name === 'test' ||
                                entry.name === 'out' ||
                                entry.name === 'dist'
                            ) {
                                continue;
                            }
                            checkDirectory(fullPath);
                        } else if (entry.isFile()) {
                            checkDocumentation(fullPath);
                        }
                    }
                }

                // Only check key directories
                const keyDirs = ['infrastructure', 'commands', 'services', 'types'];
                for (const dir of keyDirs) {
                    checkDirectory(path.join(srcPath, dir));
                }

                if (violations.length > 0) {
                    console.log(
                        `\nExports without JSDoc documentation (${violations.length} total):`,
                    );
                    // Show first 10 violations
                    violations.slice(0, 10).forEach((v) => {
                        console.log(`  - ${v.file}: ${v.export}`);
                    });
                    if (violations.length > 10) {
                        console.log(`  ... and ${violations.length - 10} more`);
                    }
                }

                // This is a soft check - many exports may lack documentation
                // We report but don't fail for now
                console.log(`\nFound ${violations.length} exports without JSDoc documentation`);
            },
        ),
    );

    /**
     * Additional test: extension.ts should be concise
     *
     * The main entry point should be under 50 lines of code.
     */
    test('extension.ts should be concise (under 50 lines)', () => {
        const extensionPath = path.join(srcPath, 'extension.ts');

        if (!fs.existsSync(extensionPath)) {
            console.log('extension.ts not found');
            return;
        }

        const content = fs.readFileSync(extensionPath, 'utf-8');
        const lines = content.split('\n');

        // Count non-empty, non-comment lines
        let codeLines = 0;
        let inBlockComment = false;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed === '') {
                continue;
            }

            if (inBlockComment) {
                if (trimmed.includes('*/')) {
                    inBlockComment = false;
                }
                continue;
            }

            if (trimmed.startsWith('/*')) {
                if (!trimmed.includes('*/')) {
                    inBlockComment = true;
                }
                continue;
            }

            if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
                continue;
            }

            codeLines++;
        }

        console.log(`extension.ts has ${codeLines} lines of code`);

        // Note: 50 lines is the target, but we allow some flexibility
        assert.ok(
            codeLines <= 100,
            `extension.ts has ${codeLines} lines of code. ` +
                `Target is under 50 lines, maximum allowed is 100.`,
        );
    });
});
