import * as vscode from 'vscode';
import { generateCommit } from './commands/generateCommit';
import { generatePR } from './commands/generatePR';
import { showLanguageQuickPick } from './languages';
import { MESSAGE_STYLES } from './types/messageStyle';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    // ステータスバーアイテムの初期化
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'otak-committer.changeLanguage';
    statusBarItem.tooltip = 'Click to change commit message language';

    // 現在の言語を表示
    const updateStatusBar = () => {
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const language = config.get<string>('language') || 'english';
        statusBarItem.text = `$(globe) ${language}`;
    };

    // Gitリポジトリの有無を確認してステータスバーを表示
    const checkGitRepository = async () => {
        const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
        if (gitExtension) {
            const api = gitExtension.getAPI(1);
            if (api.repositories.length > 0) {
                updateStatusBar();
                statusBarItem.show();
            } else {
                statusBarItem.hide();
            }
        }
    };

    // コマンドの登録
    const disposables = [
        vscode.commands.registerCommand(
            'otak-committer.generateMessage',
            () => generateCommit(context)
        ),
        vscode.commands.registerCommand(
            'otak-committer.generatePR',
            () => generatePR(context)
        ),
        vscode.commands.registerCommand(
            'otak-committer.openSettings',
            () => vscode.commands.executeCommand('workbench.action.openSettings', 'otakCommitter')
        ),
        vscode.commands.registerCommand(
            'otak-committer.changeLanguage',
            async () => {
                const language = await showLanguageQuickPick();
                if (language) {
                    await vscode.workspace.getConfiguration('otakCommitter').update(
                        'language',
                        language,
                        vscode.ConfigurationTarget.Global
                    );
                    updateStatusBar();
                }
            }
        ),
        vscode.commands.registerCommand(
            'otak-committer.changeMessageStyle',
            async () => {
                const styles = Object.entries(MESSAGE_STYLES).map(([id, config]) => ({
                    label: id.charAt(0).toUpperCase() + id.slice(1),
                    description: config.description
                }));

                const selected = await vscode.window.showQuickPick(styles, {
                    placeHolder: 'Select commit message style'
                });

                if (selected) {
                    await vscode.workspace.getConfiguration('otakCommitter').update(
                        'messageStyle',
                        selected.label.toLowerCase(),
                        vscode.ConfigurationTarget.Global
                    );
                }
            }
        ),
        // 設定変更の監視
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('otakCommitter.language')) {
                updateStatusBar();
            }
        }),
        // Gitリポジトリの変更を監視
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            checkGitRepository();
        }),
        // ステータスバーアイテムの登録
        statusBarItem
    ];

    // 全てのdisposableをコンテキストに登録
    context.subscriptions.push(...disposables);

    // 初期化時のGitリポジトリチェック
    checkGitRepository();
}

export function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
