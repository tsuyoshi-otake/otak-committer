/**
 * Standalone test runner for unit and property-based tests
 * This runs tests without launching VS Code, useful for quick feedback during development
 * 
 * Note: This only works for tests that don't require VS Code APIs
 */

import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

async function runUnitTests() {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 15000,
        slow: 5000,
        reporter: 'spec',
    });

    const testsRoot = path.resolve(__dirname, '..');

    try {
        // Find test files in __tests__ directories (excluding integration tests that need VS Code)
        const propertyTests = await glob('__tests__/properties/**/*.test.js', { cwd: testsRoot });
        const utilTests = await glob('utils/__tests__/**/*.test.js', { cwd: testsRoot });
        const commandTests = await glob('commands/__tests__/**/*.test.js', { cwd: testsRoot });
        const serviceTests = await glob('services/__tests__/**/*.test.js', { cwd: testsRoot });
        // Note: Infrastructure tests are excluded as they all require VS Code context
        // const infrastructureTests = await glob('infrastructure/**/__tests__/**/*.test.js', { cwd: testsRoot });
        const i18nTests = await glob('i18n/__tests__/**/*.test.js', { cwd: testsRoot });
        const i18nIntegrationTests = await glob('__tests__/integration/i18n*.test.js', { cwd: testsRoot });

        // Filter out tests that require VS Code APIs (all infra tests need VS Code context)
        const filteredInfraTests: string[] = [];

        // Filter out property tests that require VS Code APIs
        // Only include: dependencies.property, architecture.property, setup.property
        const filteredPropertyTests = propertyTests.filter(test =>
            test.includes('dependencies.property') ||
            test.includes('architecture.property') ||
            test.includes('setup.property')
        );

        // Filter out command tests that require VS Code APIs
        const filteredCommandTests = commandTests.filter(test =>
            !test.includes('PRCommand') &&
            !test.includes('CommitCommand') &&
            !test.includes('IssueCommand') &&
            !test.includes('ConfigCommand') &&
            !test.includes('BaseCommand') &&
            !test.includes('CommandRegistry')
        );

        // Filter out service tests that require VS Code APIs
        const filteredServiceTests = serviceTests.filter(test =>
            !test.includes('services.test') &&
            !test.includes('openai')
        );

        const allTests = [...filteredPropertyTests, ...utilTests, ...filteredCommandTests, ...filteredServiceTests, ...filteredInfraTests, ...i18nTests, ...i18nIntegrationTests];

        console.log(`Found ${allTests.length} test file(s):`);
        console.log(`  - Property tests: ${filteredPropertyTests.length}`);
        console.log(`  - Utils tests: ${utilTests.length}`);
        console.log(`  - Command tests: ${filteredCommandTests.length}`);
        console.log(`  - Service tests: ${filteredServiceTests.length}`);
        console.log(`  - Infrastructure tests: ${filteredInfraTests.length}`);
        console.log(`  - i18n tests: ${i18nTests.length}`);
        console.log(`  - i18n integration tests: ${i18nIntegrationTests.length}`);
        
        // Add files to the test suite
        allTests.forEach((f: string) => {
            mocha.addFile(path.resolve(testsRoot, f));
        });

        // Run the tests
        return new Promise<void>((resolve, reject) => {
            mocha.run((failures: number) => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    console.log('\n✓ All tests passed!');
                    resolve();
                }
            });
        });
    } catch (err) {
        console.error('Error running tests:', err);
        throw err;
    }
}

// Run if called directly
if (require.main === module) {
    runUnitTests()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}

export { runUnitTests };
