import * as vscode from 'vscode';
import * as path from 'path';
import type { Agent } from 'http';
import { HttpsProxyAgent } from 'https-proxy-agent';

function convertMarkdownToPlainText(markdown: string): string {
    return markdown.replace(/```/g, '').trim();
}

/**
 * Get http.proxy value from VS Code settings and
 * create HttpsProxyAgent if proxy is configured
 */
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

interface LanguageConfig {
    name: string;
    systemPrompt: (style: MessageStyle) => string;
    diffMessage: string;
}

type MessageStyle = 'simple' | 'normal' | 'detailed';

interface MessageStyleConfig {
    tokens: number;
    description: string;
}

const COMMIT_PREFIX_GUIDE = `
# ==== Prefix ====
# fix:      A bug fix
# feat:     A new feature
# docs:     Documentation only changes
# style:    Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
# refactor: A code change that neither fixes a bug nor adds a feature
# perf:     A code change that improves performance
# test:     Adding missing or correcting existing tests
# chore:    Changes to the build process or auxiliary tools and libraries such as documentation generation
`;

const MESSAGE_STYLES: Record<MessageStyle, MessageStyleConfig> = {
    simple: {
        tokens: 100,
        description: "Generate a very concise commit message focusing only on the core change."
    },
    normal: {
        tokens: 200,
        description: "Generate a commit message with a brief explanation of the changes."
    },
    detailed: {
        tokens: 500,
        description: "Generate a detailed commit message including context, reasoning, and impact of the changes."
    }
};

const LANGUAGE_CONFIGS: { [key: string]: LanguageConfig } = {
    english: {
        name: 'English',
        systemPrompt: (style) => `You are a commit message expert. ${MESSAGE_STYLES[style].description} Follow the Conventional Commits format with these prefixes:${COMMIT_PREFIX_GUIDE}\nOutput the commit message as plain text without any Markdown formatting. Use proper line breaks and make it suitable for direct use in Git commit.`,
        diffMessage: "Generate a commit message for the following Git diff as plain text without Markdown formatting:"
    },
    french: {
        name: 'Français',
        systemPrompt: (style) => `Vous êtes un expert en messages de commit. ${MESSAGE_STYLES[style].description} Suivez le format Conventional Commits avec ces préfixes:${COMMIT_PREFIX_GUIDE}\nGénérez le message de commit en texte brut sans formatage Markdown. Utilisez des sauts de ligne appropriés et rendez-le adapté pour une utilisation directe dans Git commit.`,
        diffMessage: "Générez un message de commit pour le diff Git suivant en texte brut sans formatage Markdown :"
    },
    german: {
        name: 'Deutsch',
        systemPrompt: (style) => `Sie sind ein Commit-Message-Experte. ${MESSAGE_STYLES[style].description} Folgen Sie dem Conventional-Commits-Format mit diesen Präfixen:${COMMIT_PREFIX_GUIDE}\nAusgabe der Commit-Nachricht als Klartext ohne Markdown-Formatierung. Verwenden Sie geeignete Zeilenumbrüche und machen Sie sie für die direkte Verwendung in Git-Commits geeignet.`,
        diffMessage: "Generieren Sie eine Commit-Nachricht für den folgenden Git-Diff als Klartext ohne Markdown-Formatierung:"
    },
    italian: {
        name: 'Italiano',
        systemPrompt: (style) => `Sei un esperto di messaggi di commit. ${MESSAGE_STYLES[style].description} Segui il formato Conventional Commits con questi prefissi:${COMMIT_PREFIX_GUIDE}\nGenerare il messaggio di commit come testo semplice senza formattazione Markdown. Utilizzare interruzioni di riga appropriate e renderlo adatto per l'uso diretto in Git commit.`,
        diffMessage: "Genera un messaggio di commit per il seguente diff Git come testo semplice senza formattazione Markdown:"
    },
    japanese: {
        name: '日本語',
        systemPrompt: (style) => `あなたはコミットメッセージを生成する専門家です。${MESSAGE_STYLES[style].description} 以下のプレフィックスを使用してConventional Commits形式に従ってください：${COMMIT_PREFIX_GUIDE}\nコミットメッセージはMarkdown形式を使用せず、プレーンテキストとして出力してください。適切な改行を使用し、Gitのコミットメッセージとして直接使用できる形式にしてください。`,
        diffMessage: "以下のGit diffに対するコミットメッセージを生成してください。Markdown形式ではなくプレーンテキストで出力してください："
    },
    chinese: {
        name: '中文',
        systemPrompt: (style) => `您是提交消息专家。${MESSAGE_STYLES[style].description} 请按照Conventional Commits格式使用以下前缀：${COMMIT_PREFIX_GUIDE}\n以纯文本格式输出提交消息，不使用Markdown格式。使用适当的换行符，使其适合直接用于Git提交。`,
        diffMessage: "为以下Git差异生成提交消息，并以纯文本（不使用Markdown格式）输出："
    },
    korean: {
        name: '한국어',
        systemPrompt: (style) => `당신은 커밋 메시지 전문가입니다. ${MESSAGE_STYLES[style].description} Conventional Commits 형식과 다음 접두사를 사용하세요:${COMMIT_PREFIX_GUIDE}\n커밋 메시지를 Markdown 형식 없이 일반 텍스트로 출력하세요. 적절한 줄바꿈을 사용하고 Git 커밋에 직접 사용하기 적합한 형식으로 만드세요.`,
        diffMessage: "다음 Git diff에 대한 커밋 메시지를 생성하세요. Markdown 형식이 아닌 일반 텍스트로 출력하세요:"
    },
    vietnamese: {
        name: 'Tiếng Việt',
        systemPrompt: (style) => `Bạn là chuyên gia về tin nhắn commit. ${MESSAGE_STYLES[style].description} Sử dụng định dạng Conventional Commits với các tiền tố sau:${COMMIT_PREFIX_GUIDE}\nXuất tin nhắn commit dưới dạng văn bản thuần túy không có định dạng Markdown. Sử dụng ngắt dòng phù hợp và làm cho nó phù hợp để sử dụng trực tiếp trong Git commit.`,
        diffMessage: "Tạo tin nhắn commit cho Git diff sau, và xuất dưới dạng văn bản thuần túy (không có định dạng Markdown):"
    },
    russian: {
        name: 'Русский',
        systemPrompt: (style) => `Вы эксперт по сообщениям коммитов. ${MESSAGE_STYLES[style].description} Используйте формат Conventional Commits с этими префиксами:${COMMIT_PREFIX_GUIDE}\nВыводите сообщение коммита в виде простого текста без форматирования Markdown. Используйте правильные переносы строк и сделайте его подходящим для прямого использования в Git commit.`,
        diffMessage: "Сгенерируйте сообщение коммита для следующего Git diff, выводите его в виде простого текста без Markdown форматирования:"
    }
};

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

export async function generateCommitMessageWithAI(diff: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('otakCommitter');
    const apiKey = config.get<string>('openaiApiKey');
    const language = config.get<string>('language') || 'japanese';
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
                        content: `${languageConfig.diffMessage}\n\n${diff}`
                    }
                ],
                temperature: 0.2,
                max_tokens: MESSAGE_STYLES[messageStyle].tokens
            }),
        };

        // プロキシエージェントが存在する場合はリクエストオプションに追加
        if (proxyAgent) {
            (requestOptions as any).agent = proxyAgent;
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

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "otak-committer" is now active!');

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
        const repository = git.repositories[0];
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
                        vscode.window.showWarningMessage('No changes to commit');
                        return;
                    } else {
                        vscode.window.showInformationMessage('Changes have been automatically staged');
                    }
                }

                const message = await generateCommitMessageWithAI(diff);
                repository.inputBox.value = message;

            } catch (error) {
                if (error instanceof Error) {
                    vscode.window.showErrorMessage(`Error: ${error.message}`);
                } else {
                    vscode.window.showErrorMessage('Failed to generate commit message');
                }
            }
        });
    });

    context.subscriptions.push(generateDisposable, openSettingsDisposable);
}

function setupRepository(repository: Repository) {
    repository.inputBox.placeholder = COMMIT_PREFIX_GUIDE;
}

export function deactivate() { }
