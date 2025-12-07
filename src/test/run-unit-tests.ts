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
        // Include: dependencies.property, architecture.property, setup.property, and new robustness tests
        const filteredPropertyTests = propertyTests.filter(test =>
            test.includes('dependencies.property') ||
            test.includes('architecture.property') ||
            test.includes('setup.property') ||
            test.includes('git-robustness.property') ||
            test.includes('sanitization.property') ||
            test.includes('error-handling-robustness.property') ||
            test.includes('edge-case.property')
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
            !test.includes('openai') &&
            !test.includes('prompt.property') &&
            !test.includes('ApiKeyManager')
        );

        // Add new robustness tests from __tests__/services and __tests__/utils and __tests__/commands
        const robustnessServiceTests = await glob('__tests__/services/**/*.test.js', { cwd: testsRoot });
        const robustnessUtilTests = await glob('__tests__/utils/**/*.test.js', { cwd: testsRoot });
        const robustnessCommandTests = await glob('__tests__/commands/**/*.test.js', { cwd: testsRoot });

        // Filter robustness tests to exclude those requiring vscode
        const filteredRobustnessServiceTests = robustnessServiceTests.filter(test =>
            test.includes('git.robustness') ||
            test.includes('prompt-edge-cases')
        );
        const filteredRobustnessUtilTests = robustnessUtilTests.filter(test =>
            test.includes('sanitization.robustness')
        );
        const filteredRobustnessCommandTests = robustnessCommandTests.filter(test =>
            test.includes('commit-error-handling')
        );

        const allTests = [
            ...filteredPropertyTests,
            ...utilTests,
            ...filteredCommandTests,
            ...filteredServiceTests,
            ...filteredInfraTests,
            ...i18nTests,
            ...i18nIntegrationTests,
            ...filteredRobustnessServiceTests,
            ...filteredRobustnessUtilTests,
            ...filteredRobustnessCommandTests
        ];

        console.log(`Found ${allTests.length} test file(s):`);
        console.log(`  - Property tests: ${filteredPropertyTests.length}`);
        console.log(`  - Utils tests: ${utilTests.length}`);
        console.log(`  - Command tests: ${filteredCommandTests.length}`);
        console.log(`  - Service tests: ${filteredServiceTests.length}`);
        console.log(`  - Infrastructure tests: ${filteredInfraTests.length}`);
        console.log(`  - i18n tests: ${i18nTests.length}`);
        console.log(`  - i18n integration tests: ${i18nIntegrationTests.length}`);
        console.log(`  - Robustness tests: ${filteredRobustnessServiceTests.length + filteredRobustnessUtilTests.length + filteredRobustnessCommandTests.length}`);
        
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
