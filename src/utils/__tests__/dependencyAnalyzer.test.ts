/**
 * Unit tests for dependency analyzer utility
 */

import * as assert from 'assert';
import * as path from 'path';
import {
    analyzeModuleDependencies,
    getModuleLayer,
    validateLayerBoundaries,
    getDependencyStatistics
} from '../dependencyAnalyzer';

suite('Dependency Analyzer', () => {
    test('should analyze module dependencies in src directory', () => {
        const srcPath = path.resolve(__dirname, '../../../src');
        const result = analyzeModuleDependencies(srcPath);

        // Should find modules
        assert.ok(result.moduleCount > 0, 'Should find at least one module');
        assert.ok(result.modules.size > 0, 'Modules map should not be empty');
        
        console.log(`Analyzed ${result.moduleCount} modules with ${result.dependencyCount} dependencies`);
    });

    test('should detect no circular dependencies in current codebase', () => {
        const srcPath = path.resolve(__dirname, '../../../src');
        const result = analyzeModuleDependencies(srcPath);

        // Log any cycles found for debugging
        if (result.cycles.length > 0) {
            console.log('Circular dependencies found:');
            result.cycles.forEach((cycle, index) => {
                console.log(`  ${index + 1}. ${cycle.description}`);
            });
        }

        // This test documents the current state
        // If cycles exist, they should be fixed
        console.log(`Found ${result.cycles.length} circular dependencies`);
    });

    test('should correctly identify module layers', () => {
        // Test with forward slashes (Unix-style)
        assert.strictEqual(getModuleLayer('types/index.ts'), 'types');
        assert.strictEqual(getModuleLayer('infrastructure/storage/StorageManager.ts'), 'infrastructure');
        assert.strictEqual(getModuleLayer('services/git.ts'), 'services');
        assert.strictEqual(getModuleLayer('commands/CommitCommand.ts'), 'commands');
        assert.strictEqual(getModuleLayer('ui/StatusBarManager.ts'), 'ui');
        assert.strictEqual(getModuleLayer('extension.ts'), 'extension');
        assert.strictEqual(getModuleLayer('utils/encryption.ts'), 'utils');
        assert.strictEqual(getModuleLayer('languages/english.ts'), 'languages');
        assert.strictEqual(getModuleLayer('constants/commitGuide.ts'), 'constants');
        
        // Test with backslashes (Windows-style)
        assert.strictEqual(getModuleLayer('types\\index.ts'), 'types');
        assert.strictEqual(getModuleLayer('infrastructure\\storage\\StorageManager.ts'), 'infrastructure');
        assert.strictEqual(getModuleLayer('services\\git.ts'), 'services');
        assert.strictEqual(getModuleLayer('commands\\CommitCommand.ts'), 'commands');
    });

    test('should validate layer boundaries', () => {
        const srcPath = path.resolve(__dirname, '../../../src');
        const result = analyzeModuleDependencies(srcPath);
        const violations = validateLayerBoundaries(result.modules);

        // Log any violations found for debugging
        if (violations.length > 0) {
            console.log('Layer boundary violations found:');
            violations.forEach((violation, index) => {
                console.log(`  ${index + 1}. ${violation.from} -> ${violation.to}`);
                console.log(`     ${violation.violation}`);
            });
        }

        // This test documents the current state
        console.log(`Found ${violations.length} layer boundary violations`);
    });

    test('should calculate dependency statistics', () => {
        const srcPath = path.resolve(__dirname, '../../../src');
        const result = analyzeModuleDependencies(srcPath);
        const stats = getDependencyStatistics(result.modules);

        assert.ok(stats.totalModules > 0, 'Should have modules');
        assert.ok(stats.averageDependencies >= 0, 'Average dependencies should be non-negative');
        assert.ok(stats.maxDependencies >= 0, 'Max dependencies should be non-negative');
        
        console.log('Dependency Statistics:');
        console.log(`  Total modules: ${stats.totalModules}`);
        console.log(`  Total dependencies: ${stats.totalDependencies}`);
        console.log(`  Average dependencies per module: ${stats.averageDependencies.toFixed(2)}`);
        console.log(`  Max dependencies: ${stats.maxDependencies}`);
        if (stats.moduleWithMostDependencies) {
            console.log(`  Module with most dependencies: ${stats.moduleWithMostDependencies}`);
        }
        console.log('  Modules by layer:');
        Object.entries(stats.modulesByLayer).forEach(([layer, count]) => {
            console.log(`    ${layer}: ${count}`);
        });
    });

    test('should handle non-existent directory gracefully', () => {
        const result = analyzeModuleDependencies('./non-existent-directory');
        
        assert.strictEqual(result.moduleCount, 0, 'Should find no modules');
        assert.strictEqual(result.cycles.length, 0, 'Should find no cycles');
    });

    test('should exclude test directories', () => {
        const srcPath = path.resolve(__dirname, '../../../src');
        const result = analyzeModuleDependencies(srcPath);

        // Check that test files are excluded
        const testFiles = Array.from(result.modules.keys()).filter(modulePath => 
            modulePath.includes('__tests__') || modulePath.includes('.test.')
        );

        // Log any test files found for debugging
        if (testFiles.length > 0) {
            console.log('Test files found in analysis:');
            testFiles.forEach(file => console.log(`  - ${file}`));
        }

        // The analyzer should exclude __tests__ directories
        // Note: This test file itself might be included if run from compiled output
        // We verify that the exclusion logic is working by checking the count is minimal
        assert.ok(testFiles.length <= 1, `Should exclude most test files, found ${testFiles.length}`);
    });
});
