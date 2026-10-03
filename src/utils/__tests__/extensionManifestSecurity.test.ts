import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

interface ExtensionManifest {
    activationEvents: string[];
    capabilities?: { untrustedWorkspaces?: { supported?: boolean } };
    contributes: { commands: unknown[]; configuration: unknown; menus: unknown };
    dependencies: Record<string, string>;
}

suite('Extension manifest security declarations', () => {
    const manifestPath = path.resolve(__dirname, '../../../package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ExtensionManifest;

    test('explicitly requires workspace trust', () => {
        assert.strictEqual(manifest.capabilities?.untrustedWorkspaces?.supported, false);
    });

    test('preserves startup activation and contributed user functionality', () => {
        assert.ok(manifest.activationEvents.includes('onStartupFinished'));
        assert.ok(manifest.contributes.configuration);
        assert.ok(manifest.contributes.commands.length > 0);
        assert.ok(manifest.contributes.menus);
    });

    test('does not ship https-proxy-agent as a production dependency', () => {
        assert.strictEqual(manifest.dependencies['https-proxy-agent'], undefined);
    });
});
