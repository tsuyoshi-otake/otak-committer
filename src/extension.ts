import * as vscode from 'vscode';
import { generateCommit } from './commands/generateCommit.js';
import { generatePR } from './commands/generatePR.js';
import { generateIssue } from './commands/generateIssue.js';
import { LANGUAGE_CONFIGS, SupportedLanguage } from './languages/index.js';
import { MessageStyle } from './types/messageStyle.js';

let languageStatusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext) {
    console.log('Activating otak-committer extension...');

    // ステータスバーアイテムの初期化を最優先で行う
    console.log('Initializing status bar item...');
    languageStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    context.subscriptions.push(languageStatusBarItem);

    // 初期設定の読み込みとステータスバーの更新
    console.log('Loading initial configuration...');
    const config = vscode.workspace.getConfiguration('otakCommitter');
    if (!config.get<string>('language')) {
        await config.update('language', 'english', vscode.ConfigurationTarget.Global);
    }
    if (!config.get<MessageStyle>('messageStyle')) {
        await config.update('messageStyle', 'normal', vscode.ConfigurationTarget.Global);
    }

    // ステータスバーを即時表示
    updateLanguageStatusBar();
    languageStatusBarItem.show();

    // コマンドの登録
    const generateCommitCommand = vscode.commands.registerCommand('otak-committer.generateMessage', async () => {
        try {
            await generateCommit();
        } catch (error) {
            console.error('Error in generateMessage command:', error);
            vscode.window.showErrorMessage(`Command execution error: ${error}`);
        }
    });

    const generatePRCommand = vscode.commands.registerCommand('otak-committer.generatePR', () => {
        generatePR();
    });

    // Generate Issueコマンドの登録
    const generateIssueCommand = vscode.commands.registerCommand('otak-committer.generateIssue', () => {
        generateIssue();
    });

    // SCMビューへのボタン追加
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('scm', {
            resolveWebviewView(webviewView) {
                // "Generate Issue"ボタンを追加
                const generateIssueButton = vscode.window.createStatusBarItem(
                    vscode.StatusBarAlignment.Left,
                    100
                );
                generateIssueButton.text = "$(issues) Generate Issue";
                generateIssueButton.command = 'otak-committer.generateIssue';
                generateIssueButton.tooltip = 'リポジトリの内容を分析してIssueを生成';
                generateIssueButton.show();
                context.subscriptions.push(generateIssueButton);
            }
        })
    );

    const changeLanguageCommand = vscode.commands.registerCommand('otak-committer.changeLanguage', async () => {
        const languages = Object.entries(LANGUAGE_CONFIGS).map(([key, config]) => ({
            label: config.label,
            description: key
        }));

        const selected = await vscode.window.showQuickPick(languages, {
            placeHolder: 'Select commit message language'
        });

        if (selected) {
            await config.update(
                'language',
                selected.description,
                vscode.ConfigurationTarget.Global
            );
            updateLanguageStatusBar();
        }
    });

    const changeMessageStyleCommand = vscode.commands.registerCommand('otak-committer.changeMessageStyle', async () => {
        const styles = [
            { label: 'Normal', description: 'normal' },
            { label: 'Simple', description: 'simple' },
            { label: 'Detailed', description: 'detailed' }
        ];

        const selected = await vscode.window.showQuickPick(styles, {
            placeHolder: 'Select message style'
        });

        if (selected) {
            await config.update(
                'messageStyle',
                selected.description,
                vscode.ConfigurationTarget.Global
            );
            updateLanguageStatusBar();
        }
    });

    const openSettingsCommand = vscode.commands.registerCommand('otak-committer.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'otakCommitter');
    });

    context.subscriptions.push(
        generateCommitCommand,
        generatePRCommand,
        generateIssueCommand,
        changeLanguageCommand,
        changeMessageStyleCommand,
        openSettingsCommand
    );

    // 設定変更の監視
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('otakCommitter')) {
                updateLanguageStatusBar();
            }
        })
    );

    console.log('Extension activation completed.');
}

function updateLanguageStatusBar() {
    console.log('Updating language status bar...');
    const config = vscode.workspace.getConfiguration('otakCommitter');
    const language = config.get<string>('language') || 'english';
    const languageConfig = LANGUAGE_CONFIGS[language as SupportedLanguage];

    if (languageConfig) {
        languageStatusBarItem.text = `$(globe) ${languageConfig.label}`;

        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.supportThemeIcons = true;

        tooltip.appendMarkdown(`Configuration\n\n`);
        tooltip.appendMarkdown(`Current Style: ${config.get<MessageStyle>('messageStyle') || 'normal'}\n\n`);
        tooltip.appendMarkdown(`---\n\n`);
        tooltip.appendMarkdown(`$(versions) [Change Message Style](command:otak-committer.changeMessageStyle) &nbsp;&nbsp; $(gear) [Open Settings](command:otak-committer.openSettings)`);

        languageStatusBarItem.tooltip = tooltip;
        languageStatusBarItem.command = {
            title: 'Change Language',
            command: 'otak-committer.changeLanguage'
        };

        languageStatusBarItem.show();
        console.log('Language status bar updated successfully');
    }
}

export function deactivate() {
    if (languageStatusBarItem) {
        languageStatusBarItem.dispose();
    }
}
