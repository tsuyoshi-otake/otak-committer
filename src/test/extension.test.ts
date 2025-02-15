import * as assert from 'assert';
import * as vscode from 'vscode';
import { generateCommitMessageWithAI, stageAllChanges } from '../extension';
import * as path from 'path';
import { before } from 'mocha';

suite('OTAK Committer Extension', () => {
    const mockDiff = `
diff --git a/src/example.ts b/src/example.ts
index 123..456 789
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,3 +1,4 @@
+import { newFeature } from './utils';
 function existingFunction() {
-  return 'old';
+  return 'new';
 }
`;

    const mockFilePath = path.normalize('src/example.ts');

    // モックリポジトリ
    const mockRepository = {
        inputBox: {
            value: '',
            placeholder: ''
        },
        state: {
            workingTreeChanges: [
                {
                    uri: vscode.Uri.file(mockFilePath),
                    status: 1
                }
            ],
            indexChanges: []
        },
        diff: async () => mockDiff,
        add: async (_paths: string[]) => {
            // モックメソッドなので何もしない
        }
    };

    let originalGetConfiguration: typeof vscode.workspace.getConfiguration;
    let originalFetch: typeof global.fetch;

    suiteSetup(() => {
        // 設定のモック
        originalGetConfiguration = vscode.workspace.getConfiguration;
        originalFetch = global.fetch;

        vscode.workspace.getConfiguration = () => ({
            get: (key: string) => {
                switch (key) {
                    case 'openaiApiKey':
                        return 'test-api-key';
                    case 'language':
                        return 'japanese';
                    case 'messageStyle':
                        return 'normal';
                    default:
                        return undefined;
                }
            },
            update: () => Promise.resolve(),
            has: () => false,
            inspect: () => undefined
        } as vscode.WorkspaceConfiguration);
    });

    suiteTeardown(() => {
        // 元の設定を復元
        vscode.workspace.getConfiguration = originalGetConfiguration;
        global.fetch = originalFetch;
    });

    test('generateCommitMessageWithAI should generate commit message', async () => {
        const expectedMessage = 'feat: implement new feature and update return value';
        
        // fetchをモック化
        global.fetch = async () => Promise.resolve({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: expectedMessage } }]
            })
        } as Response);

        const message = await generateCommitMessageWithAI(mockDiff);
        assert.strictEqual(message, expectedMessage);
    });

    test('generateCommitMessageWithAI should throw error when API key is not configured', async () => {
        // 設定を一時的に変更
        vscode.workspace.getConfiguration = () => ({
            get: () => undefined,
            update: () => Promise.resolve(),
            has: () => false,
            inspect: () => undefined
        } as vscode.WorkspaceConfiguration);

        try {
            await generateCommitMessageWithAI(mockDiff);
            assert.fail('Should throw error');
        } catch (error) {
            assert.strictEqual(
                (error as Error).message,
                'OpenAI API key is not configured'
            );
        }
    });

    test('stageAllChanges should stage unstaged changes', async () => {
        let addCalled = false;
        const testRepo = {
            ...mockRepository,
            add: async (paths: string[]) => {
                addCalled = true;
                assert.deepStrictEqual(
                    paths,
                    [mockFilePath]
                );
            }
        };

        await stageAllChanges(testRepo);
        assert.strictEqual(addCalled, true);
    });

    test('stageAllChanges should do nothing when no changes', async () => {
        const emptyRepo = {
            ...mockRepository,
            state: {
                workingTreeChanges: [],
                indexChanges: []
            },
            add: async () => {
                assert.fail('Should not call add');
            }
        };

        await stageAllChanges(emptyRepo);
    });
});
