import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
    // Create the mocha test with configuration for both unit and property-based tests
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 15000, // Increased timeout for property-based tests
        slow: 5000,
        reporter: 'spec',
    });

    const testsRoot = path.resolve(__dirname, '..');
    const projectRoot = path.resolve(__dirname, '../..');

    try {
        // Find all test files including:
        // - Unit tests in __tests__ directories
        // - Property-based tests in __tests__/properties
        // - Integration tests in __tests__/integration
        // - Infrastructure tests in infrastructure/**/__tests__
        // - Legacy tests in test/suite
        const testFiles = await glob('**/**.test.js', { cwd: testsRoot });
        const infrastructureFiles = await glob('infrastructure/**/__tests__/**/*.test.js', { cwd: projectRoot });
        const propertyTestFiles = await glob('__tests__/**/*.test.js', { cwd: projectRoot });
        
        const files = [
            ...testFiles.map(f => path.resolve(testsRoot, f)),
            ...infrastructureFiles.map(f => path.resolve(projectRoot, f)),
            ...propertyTestFiles.map(f => path.resolve(projectRoot, f))
        ];
        
        // Add files to the test suite
        files.forEach((f: string) => mocha.addFile(f));

        console.log(`Found ${files.length} test file(s)`);

        return new Promise<void>((resolve, reject) => {
            try {
                // Run the mocha test
                mocha.run((failures: number) => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                console.error(err);
                reject(err);
            }
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}