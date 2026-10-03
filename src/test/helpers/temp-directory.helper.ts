/**
 * Cleanup for temporary directories created by tests
 */

import * as fs from 'fs';
import * as path from 'path';

function makeWritable(target: string): void {
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        const entryPath = path.join(target, entry.name);
        if (entry.isDirectory()) {
            makeWritable(entryPath);
        } else if (entry.isFile()) {
            fs.chmodSync(entryPath, 0o666);
        }
    }
}

/**
 * Removes a temporary directory, including git's read-only object files
 *
 * The Node runtime of the VS Code test host (24.x) fails `fs.rmSync` with
 * EPERM on Windows read-only files, so the read-only bit is cleared first.
 *
 * @param dir - Directory to remove; a missing directory is ignored
 */
export function removeTempDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
        return;
    }
    makeWritable(dir);
    fs.rmSync(dir, { recursive: true, force: true });
}
