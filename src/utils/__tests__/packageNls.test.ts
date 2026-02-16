/**
 * Tests for VS Code manifest localization (package.nls.*)
 *
 * Ensures any "%key%" placeholders in package.json exist in all package.nls files.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function readJsonFile(filePath: string): JsonValue {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as JsonValue;
}

function collectPlaceholders(value: JsonValue, keys: Set<string>): void {
    if (typeof value === 'string') {
        const match = value.match(/^%([^%]+)%$/);
        if (match) {
            keys.add(match[1]);
        }
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            collectPlaceholders(item as JsonValue, keys);
        }
        return;
    }

    if (value && typeof value === 'object') {
        for (const v of Object.values(value)) {
            collectPlaceholders(v as JsonValue, keys);
        }
    }
}

suite('Manifest Localization (package.nls) Tests', () => {
    test('all %...% keys in package.json should exist in all package.nls files', () => {
        const repoRoot = path.resolve(__dirname, '../../..');

        const packageJsonPath = path.join(repoRoot, 'package.json');
        const packageJson = readJsonFile(packageJsonPath);

        const placeholderKeys = new Set<string>();
        collectPlaceholders(packageJson, placeholderKeys);

        const nlsFiles = [
            'package.nls.json',
            'package.nls.ja.json',
            'package.nls.vi.json',
            'package.nls.ko.json',
            'package.nls.zh-cn.json',
            'package.nls.zh-tw.json'
        ];

        for (const fileName of nlsFiles) {
            const nlsPath = path.join(repoRoot, fileName);
            assert.ok(fs.existsSync(nlsPath), `Missing file: ${fileName}`);

            const nlsJson = readJsonFile(nlsPath);
            assert.ok(nlsJson && typeof nlsJson === 'object' && !Array.isArray(nlsJson), `${fileName} must be an object`);

            const dict = nlsJson as Record<string, unknown>;
            const missing: string[] = [];

            for (const key of placeholderKeys) {
                if (!(key in dict)) {
                    missing.push(key);
                }
            }

            assert.strictEqual(
                missing.length,
                0,
                `Missing ${missing.length} package.nls keys in ${fileName}:\n- ${missing.join('\n- ')}`
            );
        }
    });
});

