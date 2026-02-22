import { suite, test } from 'mocha';
import * as assert from 'assert';
import {
    FilePriority,
    isLockFile,
    isLowPriorityFile,
    classifyFilePriority,
    LOCK_FILE_NAMES,
} from '../diffClassification';

suite('diffClassification', () => {
    suite('isLockFile', () => {
        test('should detect package-lock.json', () => {
            assert.strictEqual(isLockFile('package-lock.json'), true);
        });

        test('should detect yarn.lock', () => {
            assert.strictEqual(isLockFile('yarn.lock'), true);
        });

        test('should detect pnpm-lock.yaml', () => {
            assert.strictEqual(isLockFile('pnpm-lock.yaml'), true);
        });

        test('should detect Cargo.lock', () => {
            assert.strictEqual(isLockFile('Cargo.lock'), true);
        });

        test('should detect go.sum', () => {
            assert.strictEqual(isLockFile('go.sum'), true);
        });

        test('should detect lock files in subdirectories', () => {
            assert.strictEqual(isLockFile('frontend/package-lock.json'), true);
            assert.strictEqual(isLockFile('packages/app/yarn.lock'), true);
        });

        test('should not detect regular files as lock files', () => {
            assert.strictEqual(isLockFile('src/index.ts'), false);
            assert.strictEqual(isLockFile('package.json'), false);
            assert.strictEqual(isLockFile('lock.ts'), false);
        });

        test('should cover all defined lock file names', () => {
            for (const lockFile of LOCK_FILE_NAMES) {
                assert.strictEqual(isLockFile(lockFile), true, `Expected ${lockFile} to be detected`);
            }
        });
    });

    suite('isLowPriorityFile', () => {
        test('should detect minified JS files', () => {
            assert.strictEqual(isLowPriorityFile('bundle.min.js'), true);
        });

        test('should detect minified CSS files', () => {
            assert.strictEqual(isLowPriorityFile('styles.min.css'), true);
        });

        test('should detect TypeScript declaration files', () => {
            assert.strictEqual(isLowPriorityFile('types.d.ts'), true);
        });

        test('should detect snapshot files', () => {
            assert.strictEqual(isLowPriorityFile('Component.test.snap'), true);
        });

        test('should detect source map files', () => {
            assert.strictEqual(isLowPriorityFile('bundle.js.map'), true);
        });

        test('should detect generated files', () => {
            assert.strictEqual(isLowPriorityFile('schema.generated.ts'), true);
        });

        test('should detect files in dist directory', () => {
            assert.strictEqual(isLowPriorityFile('dist/index.js'), true);
        });

        test('should detect files in build directory', () => {
            assert.strictEqual(isLowPriorityFile('build/output.js'), true);
        });

        test('should detect files in __snapshots__ directory', () => {
            assert.strictEqual(isLowPriorityFile('src/__snapshots__/test.snap'), true);
        });

        test('should not detect regular source files', () => {
            assert.strictEqual(isLowPriorityFile('src/index.ts'), false);
            assert.strictEqual(isLowPriorityFile('src/components/Button.tsx'), false);
        });

        test('should handle backslash paths (Windows)', () => {
            assert.strictEqual(isLowPriorityFile('dist\\index.js'), true);
            assert.strictEqual(isLowPriorityFile('build\\output.js'), true);
        });
    });

    suite('classifyFilePriority', () => {
        test('should classify lock files as EXCLUDE', () => {
            assert.strictEqual(classifyFilePriority('package-lock.json'), FilePriority.EXCLUDE);
            assert.strictEqual(classifyFilePriority('yarn.lock'), FilePriority.EXCLUDE);
        });

        test('should classify generated files as LOW', () => {
            assert.strictEqual(classifyFilePriority('bundle.min.js'), FilePriority.LOW);
            assert.strictEqual(classifyFilePriority('types.d.ts'), FilePriority.LOW);
            assert.strictEqual(classifyFilePriority('dist/index.js'), FilePriority.LOW);
        });

        test('should classify source files as HIGH', () => {
            assert.strictEqual(classifyFilePriority('src/index.ts'), FilePriority.HIGH);
            assert.strictEqual(classifyFilePriority('src/services/git.ts'), FilePriority.HIGH);
            assert.strictEqual(classifyFilePriority('README.md'), FilePriority.HIGH);
        });

        test('should prioritize EXCLUDE over LOW for lock files in low-priority dirs', () => {
            assert.strictEqual(
                classifyFilePriority('dist/package-lock.json'),
                FilePriority.EXCLUDE,
            );
        });
    });
});
