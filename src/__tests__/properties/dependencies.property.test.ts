/**
 * Property-based tests for module dependencies
 * 
 * **Feature: extension-architecture-refactoring, Property 1: No Circular Dependencies**
 * **Validates: Requirements 1.4, 6.3, 8.1**
 * 
 * This test ensures that the module dependency graph is acyclic.
 * Circular dependencies make code harder to understand, test, and maintain.
 */

import * as assert from 'assert';
import * as path from 'path';
import { analyzeModuleDependencies } from '../../utils/dependencyAnalyzer';
import { createTaggedPropertyTest } from '../../test/helpers/property-test.helper';

suite('Module Dependency Properties', () => {
    /**
     * Property 1: No Circular Dependencies
     * 
     * For any two modules A and B in the codebase, if A imports from B,
     * then B should not import from A (directly or transitively).
     * 
     * This property is tested by analyzing the entire dependency graph
     * and detecting cycles using depth-first search.
     */
    test('Property 1: No Circular Dependencies', createTaggedPropertyTest(
        'extension-architecture-refactoring',
        1,
        'No Circular Dependencies',
        () => {
            // Analyze the entire src directory
            const srcPath = path.resolve(__dirname, '../../../src');
            const result = analyzeModuleDependencies(srcPath);

            // Log analysis results for debugging
            console.log(`Analyzed ${result.moduleCount} modules with ${result.dependencyCount} dependencies`);

            // If cycles are found, log them for debugging
            if (result.cycles.length > 0) {
                console.log('\nCircular dependencies detected:');
                result.cycles.forEach((cycle, index) => {
                    console.log(`\n  Cycle ${index + 1}:`);
                    console.log(`    ${cycle.description}`);
                    console.log(`    Modules involved:`);
                    cycle.cycle.forEach(modulePath => {
                        console.log(`      - ${modulePath}`);
                    });
                });
            }

            // Assert: No circular dependencies should exist
            assert.strictEqual(
                result.cycles.length,
                0,
                `Found ${result.cycles.length} circular dependencies. ` +
                `The codebase should have an acyclic dependency graph. ` +
                `See console output for details.`
            );
        }
    ));

    /**
     * Additional validation: Type system should have no circular dependencies
     * 
     * This is a more focused test that specifically checks the types directory,
     * which is the foundation of the codebase and should be especially clean.
     */
    test('Type system should have no circular dependencies', () => {
        const srcPath = path.resolve(__dirname, '../../../src');
        const result = analyzeModuleDependencies(srcPath);

        // Filter to only type-related modules
        const typeModules = Array.from(result.modules.entries())
            .filter(([modulePath]) => modulePath.includes('types/') || modulePath.includes('types\\'));

        console.log(`Analyzed ${typeModules.length} type modules`);

        // Check for cycles involving type modules
        const typeCycles = result.cycles.filter(cycle =>
            cycle.cycle.some(modulePath =>
                modulePath.includes('types/') || modulePath.includes('types\\')
            )
        );

        if (typeCycles.length > 0) {
            console.log('\nCircular dependencies in type system:');
            typeCycles.forEach((cycle, index) => {
                console.log(`  ${index + 1}. ${cycle.description}`);
            });
        }

        assert.strictEqual(
            typeCycles.length,
            0,
            `Found ${typeCycles.length} circular dependencies involving type modules. ` +
            `The type system should be especially clean and acyclic.`
        );
    });
});
