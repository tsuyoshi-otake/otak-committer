import * as vscode from 'vscode';
import { generateCommit } from './commands/generateCommit';
import { generatePR } from './commands/generatePR';
import { SupportedLanguage, LANGUAGE_CONFIGS } from './languages/index';
import { LanguageSettings } from './types/language';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    // ステータスバーアイテムの作成
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(pencil) Otak";
    statusBarItem.tooltip = "Otak Committer";
    statusBarItem.command = 'otakCommitter.showCommands';
    statusBarItem.show();

    // コマンドの登録
    let disposables = [
        vscode.commands.registerCommand('otakCommitter.generateCommit', generateCommit),
        vscode.commands.registerCommand('otakCommitter.generatePR', generatePR),
        vscode.commands.registerCommand('otakCommitter.showCommands', showCommandQuickPick),
        statusBarItem
    ];

    context.subscriptions.push(...disposables);

    // 設定変更の監視
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('otakCommitter')) {
                updateStatusBarItem();
            }
        })
    );

    // 初期設定の確認と更新
    updateStatusBarItem();
}

async function showCommandQuickPick(): Promise<void> {
    const items: vscode.QuickPickItem[] = [
        {
            label: "$(git-commit) Generate Commit Message",
            description: "Create a commit message from changes",
            detail: "Generates a commit message based on the current changes in your workspace"
        },
        {
            label: "$(git-pull-request) Generate Pull Request",
            description: "Create a pull request",
            detail: "Generates a pull request with title and description based on your changes"
        }
    ];

    try {
        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: "Select a command to execute"
        });

        if (!selection) {
            return;
        }

        if (selection.label.includes("Commit")) {
            await vscode.commands.executeCommand('otakCommitter.generateCommit');
        } else if (selection.label.includes("Pull Request")) {
            await vscode.commands.executeCommand('otakCommitter.generatePR');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`コマンドの実行中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
}

function updateStatusBarItem(): void {
    try {
        const config = vscode.workspace.getConfiguration('otakCommitter');
        
        // 設定から言語とメッセージスタイルを安全に取得
        const settings: LanguageSettings = {
            language: config.get<string>('language') || 'english',
            messageStyle: config.get<string>('messageStyle') || 'normal'
        };

        const languageConfig = LANGUAGE_CONFIGS[settings.language as SupportedLanguage];

        if (!languageConfig) {
            statusBarItem.tooltip = 'Otak Committer';
            return;
        }

        statusBarItem.tooltip = `Otak Committer (${languageConfig.label})`;
    } catch (error) {
        console.error('ステータスバーの更新中にエラーが発生しました:', error);
        statusBarItem.tooltip = 'Otak Committer';
    }
}

export function deactivate(): void {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
