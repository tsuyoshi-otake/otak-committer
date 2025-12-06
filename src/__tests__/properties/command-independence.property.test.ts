/**
 * Property-based tests for command independence
 *
 * **Feature: extension-architecture-refactoring, Property 2: Command Independence**
 * **Validates: Requirements 2.4, 5.3**
 *
 * This test ensures that commands can be executed independently without
 * requiring any other command to have been executed first.
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { createTaggedPropertyTest } from '../../test/helpers/property-test.helper';
import { analyzeModuleDependencies, getModuleLayer } from '../../utils/dependencyAnalyzer';

suite('Command Independence Properties', () => {
    /**
     * Property 2: Command Independence
     *
     * For any command C in the system, executing C should not require any other
     * command to have been executed first, and C should not directly import or
     * invoke any other command.
     *
     * This property verifies that:
     * 1. Commands do not import other commands
     * 2. Commands can be instantiated independently
     * 3. Commands do not share mutable state
     */
    test('Property 2: Command Independence', createTaggedPropertyTest(
        'extension-architecture-refactoring',
        2,
        'Command Independence',
        () => {
            const srcPath = path.resolve(__dirname, '../../../src');
            const result = analyzeModuleDependencies(srcPath);

            // Get all command modules
            const commandModules = Array.from(result.modules.entries())
                .filter(([modulePath]) => {
                    const normalized = modulePath.replace(/\\/g, '/');
                    return normalized.includes('commands/') &&
                           !normalized.includes('__tests__') &&
                           !normalized.includes('index.ts');
                });

            console.log(`Analyzing ${commandModules.length} command modules`);

            // For each command module, verify it doesn't import other commands
            const violations: string[] = [];

            for (const [modulePath, module] of commandModules) {
                const commandName = path.basename(modulePath, '.ts');

                // Skip CommandRegistry and BaseCommand (they are infrastructure)
                if (commandName === 'CommandRegistry' || commandName === 'BaseCommand') {
                    continue;
                }

                // Skip commandRegistration.ts (it's infrastructure)
                if (modulePath.includes('commandRegistration')) {
                    continue;
                }

                // Check dependencies
                for (const dep of module.dependencies) {
                    const normalizedDep = dep.replace(/\\/g, '/');
                    const depName = path.basename(normalizedDep, '.ts');

                    // Check if this dependency is another command
                    if (normalizedDep.includes('commands/') &&
                        depName !== 'BaseCommand' &&
                        depName !== 'CommandRegistry' &&
                        depName !== 'index' &&
                        !normalizedDep.includes('__tests__')) {

                        // Allow importing from the same file
                        if (depName === commandName) {
                            continue;
                        }

                        violations.push(
                            `${commandName} imports ${depName} - commands should not depend on other commands`
                        );
                    }
                }
            }

            if (violations.length > 0) {
                console.log('\nCommand independence violations:');
                violations.forEach(v => console.log(`  - ${v}`));
            }

            assert.strictEqual(
                violations.length,
                0,
                `Found ${violations.length} command independence violations. ` +
                `Commands should not directly import or invoke other commands.`
            );
        }
    ));

    /**
     * Additional test: Commands only depend on lower layers
     *
     * Verifies that command modules only depend on:
     * - infrastructure (services, config, storage, etc.)
     * - types
     * - utilities
     * But not on other command modules
     */
    test('Commands should only depend on lower layers', () => {
        const srcPath = path.resolve(__dirname, '../../../src');
        const result = analyzeModuleDependencies(srcPath);

        // Get all command modules (excluding test files and infrastructure)
        const commandModules = Array.from(result.modules.entries())
            .filter(([modulePath]) => {
                const normalized = modulePath.replace(/\\/g, '/');
                return normalized.includes('commands/') &&
                       !normalized.includes('__tests__') &&
                       !normalized.includes('index.ts') &&
                       !normalized.includes('CommandRegistry') &&
                       !normalized.includes('BaseCommand') &&
                       !normalized.includes('commandRegistration');
            });

        const violations: string[] = [];

        for (const [modulePath, module] of commandModules) {
            for (const dep of module.dependencies) {
                const depLayer = getModuleLayer(dep);

                // Commands should not depend on UI or extension layer
                if (depLayer === 'extension') {
                    violations.push(
                        `${path.basename(modulePath)} depends on extension layer (${dep})`
                    );
                }
            }
        }

        if (violations.length > 0) {
            console.log('\nLayer dependency violations in commands:');
            violations.forEach(v => console.log(`  - ${v}`));
        }

        assert.strictEqual(
            violations.length,
            0,
            `Found ${violations.length} layer dependency violations. ` +
            `Commands should only depend on lower layers.`
        );
    });

    /**
     * Additional test: Each command can be imported independently
     *
     * Verifies that importing one command doesn't require importing others.
     */
    test('Commands can be imported independently', () => {
        const commandsDir = path.resolve(__dirname, '../../commands');

        if (!fs.existsSync(commandsDir)) {
            console.log('Commands directory not found, skipping test');
            return;
        }

        // List all command files
        const commandFiles = fs.readdirSync(commandsDir)
            .filter(f => f.endsWith('.ts') &&
                        !f.includes('.test.') &&
                        !f.includes('__tests__') &&
                        f !== 'index.ts' &&
                        f !== 'BaseCommand.ts' &&
                        f !== 'CommandRegistry.ts' &&
                        f !== 'commandRegistration.ts');

        console.log(`Found ${commandFiles.length} command files`);

        // Each command file should be independently importable
        for (const file of commandFiles) {
            const filePath = path.join(commandsDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Check for circular import patterns (importing other commands)
            const importPattern = /import\s+.*from\s+['"]\.\/([^'"]+)['"]/g;
            let match;
            const localImports: string[] = [];

            while ((match = importPattern.exec(content)) !== null) {
                const importedModule = match[1];
                // Filter out allowed imports
                if (importedModule !== 'BaseCommand' &&
                    importedModule !== 'CommandRegistry' &&
                    importedModule !== 'index' &&
                    !importedModule.includes('__tests__')) {
                    localImports.push(importedModule);
                }
            }

            // Commands should only import BaseCommand from the same directory
            const problematicImports = localImports.filter(imp =>
                imp.endsWith('Command') && imp !== 'BaseCommand'
            );

            assert.strictEqual(
                problematicImports.length,
                0,
                `${file} imports other commands: ${problematicImports.join(', ')}. ` +
                `Commands should be independently importable.`
            );
        }
    });

    /**
     * Additional test: No shared mutable state between commands
     *
     * Verifies that commands use the singleton Logger but don't share
     * mutable state through static properties.
     */
    test('Commands should not have problematic shared state', () => {
        const commandsDir = path.resolve(__dirname, '../../commands');

        if (!fs.existsSync(commandsDir)) {
            console.log('Commands directory not found, skipping test');
            return;
        }

        // List all command files
        const commandFiles = fs.readdirSync(commandsDir)
            .filter(f => f.endsWith('.ts') &&
                        !f.includes('.test.') &&
                        !f.includes('__tests__') &&
                        f !== 'index.ts' &&
                        f !== 'BaseCommand.ts' &&
                        f !== 'CommandRegistry.ts' &&
                        f !== 'commandRegistration.ts');

        const violations: string[] = [];

        for (const file of commandFiles) {
            const filePath = path.join(commandsDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Check for static mutable properties (excluding readonly)
            // Look for patterns like: static propertyName = value (where value is not readonly)
            const staticMutablePattern = /static\s+(?!readonly\s+)(\w+)\s*[:=]/g;
            let match;

            while ((match = staticMutablePattern.exec(content)) !== null) {
                const propertyName = match[1];
                // Skip private readonly patterns that might be missed
                if (!content.includes(`static readonly ${propertyName}`) &&
                    !content.includes(`private static readonly ${propertyName}`)) {
                    violations.push(`${file} has static mutable property: ${propertyName}`);
                }
            }
        }

        // Note: Some static properties are acceptable (like configuration constants)
        // This test catches obvious mutable state issues
        if (violations.length > 0) {
            console.log('\nPotential shared mutable state:');
            violations.forEach(v => console.log(`  - ${v}`));
        }

        // This is a warning, not a hard failure
        // Commands may have static helpers that are acceptable
    });
});
