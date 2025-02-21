import * as vscode from 'vscode';
import * as path from 'path';
import type { Agent } from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { MessageStyle, MESSAGE_STYLES } from './types/messageStyle';
import { LANGUAGE_CONFIGS, LANGUAGE_DESCRIPTIONS } from './languages';
import { COMMIT_PREFIX_GUIDE } from './constants/commitGuide';

function convertMarkdownToPlainText(markdown: string): string {
    return markdown.replace(/```/g, '').trim();
}

function getProxyAgent(): Agent | undefined {
    let httpProxy: string | undefined = undefined;
    try {
        httpProxy = vscode.workspace.getConfiguration("http").get("proxy");
    } catch (e) {
        console.error("Failed to get proxy settings:", e);
    }

    if (httpProxy) {
        try {
            return new HttpsProxyAgent(httpProxy);
        } catch (error) {
            console.error("Failed to create proxy agent:", error);
            return undefined;
        }
    }
    return undefined;
}

interface GitExtension {
    getAPI(version: number): GitAPI;
}

interface GitAPI {
    repositories: Repository[];
    onDidChangeState: (listener: () => void) => vscode.Disposable;
}

interface Repository {
    inputBox: {
        value: string;
        placeholder: string;
    };
    rootUri: vscode.Uri;
    diff(staged: boolean): Promise<string>;
    state: {
        indexChanges: GitChange[];
        workingTreeChanges: GitChange[];
    };
    add(paths: string[]): Promise<void>;
}

interface GitChange {
    uri: vscode.Uri;
    status: number;
}

async function showSettingsPrompt(): Promise<boolean> {
    const response = await vscode.window.showWarningMessage(
        'OpenAI API key is not configured. Would you like to configure it now?',
        'Yes',
        'No'
    );

    if (response === 'Yes') {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'otakCommitter');
        return true;
    }
    return false;
}

export async function generateCommitMessageWithAI(diff: string, signal?: AbortSignal): Promise<string> {
    const config = vscode.workspace.getConfiguration('otakCommitter');
    const apiKey = config.get<string>('openaiApiKey');
    const language = config.get<string>('language') || 'japanese';
    const customMessage = config.get<string>('customMessage') || '';
    const messageStyle = config.get<MessageStyle>('messageStyle') || 'normal';

    if (!apiKey) {
        throw new Error('OpenAI API key is not configured');
    }

    const languageConfig = LANGUAGE_CONFIGS[language];

    try {
        // プロキシエージェントの取得
        const proxyAgent = getProxyAgent();

        // リクエストオプションの設定
        const requestOptions: RequestInit = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "x-api-key": apiKey,
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'chatgpt-4o-latest',
                messages: [
                    {
                        role: 'system',
                        content: languageConfig.systemPrompt(messageStyle)
                    },
                    {
                        role: 'user',
                        content: `${languageConfig.diffMessage}\n${customMessage ? customMessage + '\n' : ''}\n${diff}`
                    }
                ],
                temperature: 0.2,
                max_tokens: MESSAGE_STYLES[messageStyle].tokens
            }),
        };

        // プロキシエージェントが存在する場合はリクエストオプションに追加
        if (proxyAgent) {
            (requestOptions as any).agent = proxyAgent;
            requestOptions.signal = signal;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', requestOptions);

        if (!response.ok) {
            const error = await response.json();
            if (error && typeof error === 'object' && 'error' in error) {
                const apiError = error as { error: { message: string } };
                throw new Error(`OpenAI API error: ${apiError.error.message}`);
            }
            throw new Error('OpenAI API error: Unknown error');
        }

        const data = await response.json() as {
            choices: Array<{ message: { content: string } }>;
        };
        const rawMessage = data.choices[0]?.message?.content?.trim() ?? '';
        return convertMarkdownToPlainText(rawMessage);
    } catch (error) {
        if (error instanceof Error) {
            const errorMessage = error.message || 'Unknown error';
            const proxyConfig = vscode.workspace.getConfiguration("http");
            const proxyUrl = proxyConfig.get("proxy");
            const proxyInfo = proxyUrl ?
                `Proxy settings: Enabled (${proxyUrl})` :
                "Proxy settings: Disabled";

            throw new Error(
                `OpenAI API Communication Error:\n` +
                `- Error details: ${errorMessage}\n` +
                `- ${proxyInfo}\n` +
                `- Please check your network connection.`
            );
        }
        throw error;
    }
}

export async function stageAllChanges(repository: Repository): Promise<void> {
    const changes = repository.state.workingTreeChanges;
    if (changes.length === 0) {
        return;
    }

    const paths = changes.map(change => change.uri.fsPath);
    await repository.add(paths);
}

let languageStatusBarItem: vscode.StatusBarItem;

function updateLanguageStatusBar() {
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

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "otak-committer" is now active!');

    // ステータスバーアイテムを作成
    languageStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    context.subscriptions.push(languageStatusBarItem);

    // 設定変更時のイベントリスナーを登録
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('otakCommitter.language')) {
                updateLanguageStatusBar();
            }
        })
    );

    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
    if (!gitExtension) {
        vscode.window.showErrorMessage('Git extension not found');
        return;
    }

    const git = gitExtension.getAPI(1);

    git.onDidChangeState(() => {
        for (const repo of git.repositories) {
            setupRepository(repo);
        }
    });

    git.repositories.forEach(repo => {
        setupRepository(repo);
    });

    const openSettingsDisposable = vscode.commands.registerCommand('otak-committer.openSettings', async () => {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'otakCommitter');
    });

    const generateDisposable = vscode.commands.registerCommand('otak-committer.generateMessage', async () => {
        // アクティブなワークスペースのリポジトリを取得
        const activeWorkspace = vscode.window.activeTextEditor?.document.uri;
        let repository: Repository | undefined;

        if (activeWorkspace) {
            repository = git.repositories.find(repo =>
                activeWorkspace.fsPath.startsWith(vscode.Uri.file(path.dirname(repo.rootUri.fsPath)).fsPath)
            );
        }

        // アクティブなワークスペースにリポジトリがない場合は最初のリポジトリを使用
        repository = repository || git.repositories[0];

        if (!repository) {
            vscode.window.showErrorMessage('No Git repository found');
            return;
        }

        const config = vscode.workspace.getConfiguration('otakCommitter');
        const apiKey = config.get<string>('openaiApiKey');
        const messageStyle = config.get<MessageStyle>('messageStyle') || 'normal';

        if (!apiKey) {
            const shouldContinue = await showSettingsPrompt();
            if (!shouldContinue) {
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (!config.get<string>('openaiApiKey')) {
                return;
            }
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Generating ${messageStyle} commit message...`,
            cancellable: false
        }, async () => {
            try {
                let diff = await repository.diff(true);

                if (!diff) {
                    await stageAllChanges(repository);
                    diff = await repository.diff(true);

                    if (!diff) {
                        // 警告メッセージを表示し、7秒後に自動で閉じる
                        void vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: 'No changes to commit',
                            cancellable: false
                        }, () => new Promise(resolve => setTimeout(resolve, 7000)));
                        return;
                    } else {
                        // 通知を表示し、3秒後に自動で閉じる
                        void vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: 'Changes have been automatically staged',
                            cancellable: false
                        }, () => new Promise(resolve => setTimeout(resolve, 3000)));

                    }
                }

                // タイムアウト制御の追加
                const TIMEOUT_DURATION = 30000; // 30秒
                const abortController = new AbortController();
                const timeoutId = setTimeout(() => {
                    abortController.abort();
                }, TIMEOUT_DURATION);

                try {
                    const message = await generateCommitMessageWithAI(diff, abortController.signal);
                    repository.inputBox.value = message;
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') {
                        throw new Error('The request has timed out. Please wait a moment and try again.');
                    }
                    throw error;
                } finally {
                    clearTimeout(timeoutId);
                }

            } catch (error) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                } else {
                    vscode.window.showErrorMessage('Failed to generate commit message');
                }
            }
        });
    });

    // 言語変更コマンドを登録
    const changeMessageStyleDisposable = vscode.commands.registerCommand('otak-committer.changeMessageStyle', async () => {
        const styles = Object.entries(MESSAGE_STYLES).map(([key, config]) => ({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            description: `${config.tokens} tokens`,
            value: key
        }));

        const selected = await vscode.window.showQuickPick(styles, {
            placeHolder: 'Select message style',
            title: 'Change Message Style'
        });

        if (selected) {
            const config = vscode.workspace.getConfiguration('otakCommitter');
            await config.update('messageStyle', selected.value, true);

            updateLanguageStatusBar();

            void vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Message style changed to ${selected.label}`,
                cancellable: false
            }, () => new Promise(resolve => setTimeout(resolve, 3000)));
        }
    });

    const changeLanguageDisposable = vscode.commands.registerCommand('otak-committer.changeLanguage', async () => {
        const languages = Object.entries(LANGUAGE_CONFIGS).map(([key, config]) => ({
            label: config.name,
            description: LANGUAGE_DESCRIPTIONS[key],
            value: key
        }));

        const selected = await vscode.window.showQuickPick(languages, {
            placeHolder: 'Select language'
        });

        if (selected) {
            const config = vscode.workspace.getConfiguration('otakCommitter');
            await config.update('language', selected.value, true);
            updateLanguageStatusBar();
        }
    });

    context.subscriptions.push(generateDisposable, openSettingsDisposable);
    context.subscriptions.push(changeLanguageDisposable, changeMessageStyleDisposable);
    // 初期表示
    updateLanguageStatusBar();
}

function setupRepository(repository: Repository) {
    repository.inputBox.placeholder = COMMIT_PREFIX_GUIDE;
}

export function deactivate() { }
