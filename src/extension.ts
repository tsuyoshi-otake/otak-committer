import * as vscode from 'vscode';
import { generateCommit } from './commands/generateCommit';
import { generatePR } from './commands/generatePR';
import { LANGUAGE_CONFIGS } from './languages';
import { MessageStyle } from './types/messageStyle';

let languageStatusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    console.log('Activating otak-committer extension...');

    // ステータスバーアイテムの初期化
    languageStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    context.subscriptions.push(languageStatusBarItem);

    console.log('Registering commands...');

    // コマンドの登録
    const generateCommitCommand = vscode.commands.registerCommand('otak-committer.generateMessage', async () => {
        console.log('Executing generateMessage command...');
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

    const changeLanguageCommand = vscode.commands.registerCommand('otak-committer.changeLanguage', async () => {
        const languages = Object.entries(LANGUAGE_CONFIGS).map(([key, config]) => ({
            label: config.name,
            description: key
        }));

        const selected = await vscode.window.showQuickPick(languages, {
            placeHolder: 'Select commit message language'
        });

        if (selected) {
            await vscode.workspace.getConfiguration('otakCommitter').update(
                'language',
                selected.description,
                vscode.ConfigurationTarget.Global
            );
            updateLanguageStatusBar();
        }
    });

    const changeMessageStyleCommand = vscode.commands.registerCommand('otak-committer.changeMessageStyle', async () => {
        const styles: { [key: string]: string } = {
            'normal': 'Normal',
            'emoji': 'Emoji',
            'kawaii': 'Kawaii'
        };

        const selected = await vscode.window.showQuickPick(
            Object.entries(styles).map(([key, label]) => ({
                label,
                description: key
            })),
            {
                placeHolder: 'Select commit message style'
            }
        );

        if (selected) {
            await vscode.workspace.getConfiguration('otakCommitter').update(
                'messageStyle',
                selected.description as MessageStyle,
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
        changeLanguageCommand,
        changeMessageStyleCommand,
        openSettingsCommand
    );

    // 設定変更のイベントハンドラ
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('otakCommitter')) {
                updateLanguageStatusBar();
            }
        })
    );

    console.log('Initializing language status bar...');
    // 初期表示
    updateLanguageStatusBar();
    console.log('Extension activation completed.');
}

function updateLanguageStatusBar() {
    console.log('Updating language status bar...');
    const config = vscode.workspace.getConfiguration('otakCommitter');
    const language = config.get<string>('language') || 'japanese';
    const languageConfig = LANGUAGE_CONFIGS[language];

    if (languageConfig) {
        languageStatusBarItem.text = `$(globe) ${languageConfig.name}`;

        const tooltip = new vscode.MarkdownString();
        tooltip.isTrusted = true;
        tooltip.supportThemeIcons = true;

        tooltip.appendMarkdown(`Configuration\n\n`);
        tooltip.appendMarkdown(`Current Style: ${vscode.workspace.getConfiguration('otakCommitter').get<MessageStyle>('messageStyle') || 'normal'}\n\n`);
        tooltip.appendMarkdown(`---\n\n`);
        tooltip.appendMarkdown(`$(versions) [Change Message Style](command:otak-committer.changeMessageStyle) &nbsp;&nbsp; $(gear) [Open Settings](command:otak-committer.openSettings)`);

        languageStatusBarItem.tooltip = tooltip;
        languageStatusBarItem.command = {
            title: 'Change Language',
            command: 'otak-committer.changeLanguage'
        };

        languageStatusBarItem.show();
    }
}

export function deactivate() {
    if (languageStatusBarItem) {
        languageStatusBarItem.dispose();
    }
}
