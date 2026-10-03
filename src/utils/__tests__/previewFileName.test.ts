import * as assert from 'assert';
import { buildPreviewFileName, isExtensionPreviewLabel } from '../previewFileName';

suite('previewFileName', () => {
    const prFile = buildPreviewFileName('pr', 1759449600000, '1a2b3c4d');
    const issueFile = buildPreviewFileName('issue', 1759449600123, 'deadbeef');

    test('builds <prefix>-preview-<timestamp>-<hex>.md', () => {
        assert.strictEqual(prFile, 'pr-preview-1759449600000-1a2b3c4d.md');
    });

    test("recognizes this extension's preview tabs in any UI language", () => {
        for (const label of [
            `Preview ${prFile}`,
            `プレビュー ${issueFile}`,
            `${prFile} 미리 보기`,
            `[Preview] ${issueFile}`,
            prFile,
        ]) {
            assert.strictEqual(isExtensionPreviewLabel(label), true, label);
        }
    });

    test('leaves other previews and look-alike names alone', () => {
        for (const label of [
            'Preview README.md',
            'プレビュー CHANGELOG.md',
            'Release Notes Preview',
            'Preview pr-preview-notes.md',
            'Preview pr-preview-1759449600000-1A2B3C4D.md',
            `Preview ${prFile}.bak`,
            'Preview pr-preview-175944960-1a2b3c4d.md',
        ]) {
            assert.strictEqual(isExtensionPreviewLabel(label), false, label);
        }
    });
});
