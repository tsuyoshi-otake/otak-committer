import * as vscode from 'vscode';
import OpenAI from 'openai';
import { PromptType } from '../types/language';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';
import { COMMIT_PREFIXES, CommitPrefix } from '../constants/commitGuide';
import { TemplateInfo } from './git';

export class OpenAIService {
    private openai: OpenAI;

    constructor(apiKey: string | undefined) {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('OpenAI API key is required');
        }
        this.openai = new OpenAI({
            apiKey: apiKey
        });
    }

    static async showAPIKeyPrompt(): Promise<boolean> {
        const response = await vscode.window.showWarningMessage(
            'OpenAI API key is not configured. Would you like to configure it now?',
            'Yes',
            'No'
        );

        if (response === 'Yes') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'otakCommitter.openai');
            return true;
        }
        return false;
    }

    static async initialize(): Promise<OpenAIService | undefined> {
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const apiKey = config.get<string>('openaiApiKey');

        if (!apiKey || apiKey.trim() === '') {
            await OpenAIService.showAPIKeyPrompt();
            return undefined;
        }

        try {
            const service = new OpenAIService(apiKey);
            // APIキーの有効性を確認
            await service.openai.models.list();
            return service;
        } catch (error: any) {
            vscode.window.showErrorMessage(`OpenAI API Error: ${error.message}`);
            return undefined;
        }
    }

    private async getPromptForLanguage(language: string): Promise<(type: PromptType) => string> {
        try {
            switch (language) {
                case 'japanese': {
                    const { getJapanesePrompt } = await import('../languages/japanese.js');
                    return getJapanesePrompt;
                }
                case 'korean': {
                    const { getKoreanPrompt } = await import('../languages/korean.js');
                    return getKoreanPrompt;
                }
                case 'chinese': {
                    const { getChinesePrompt } = await import('../languages/chinese.js');
                    return getChinesePrompt;
                }
                case 'arabic': {
                    const { getArabicPrompt } = await import('../languages/arabic.js');
                    return getArabicPrompt;
                }
                case 'hebrew': {
                    const { getHebrewPrompt } = await import('../languages/hebrew.js');
                    return getHebrewPrompt;
                }
                default: {
                    const { getEnglishPrompt } = await import('../languages/english.js');
                    return getEnglishPrompt;
                }
            }
        } catch (error) {
            console.error('Error loading language module:', error);
            vscode.window.showErrorMessage(`Failed to load language module: ${error}`);
            try {
                const { getEnglishPrompt } = await import('../languages/english.js');
                return getEnglishPrompt;
            } catch (fallbackError) {
                console.error('Error loading fallback language module:', fallbackError);
                vscode.window.showErrorMessage(`Failed to load fallback language module: ${fallbackError}`);
                throw fallbackError;
            }
        }
    }

    private async createCommitPrompt(
        diff: string,
        language: string,
        messageStyle: MessageStyle,
        template?: TemplateInfo
    ): Promise<string> {
        // テンプレートがある場合はそれを基に生成
        if (template) {
            return `
Based on the following template and Git diff, generate a commit message:

Template:
${template.content}

Git diff:
${diff}

Please follow the template format strictly.`;
        }

        // テンプレートがない場合はPrefixを使用
        const prefixDescriptions = COMMIT_PREFIXES.map(prefix => {
            const desc = prefix.description[language as keyof CommitPrefix['description']] || prefix.description.english;
            return `${prefix.prefix}: ${desc}`;
        }).join('\n');

        return `
Generate a commit message in ${language} for the following Git diff.
Use one of these prefixes:

${prefixDescriptions}

The commit message should follow this format:
<prefix>: <subject>

<body>

The subject line should be under 50 characters.
The body should be wrapped at 72 characters.
The style should be: ${messageStyle}

Git diff:
${diff}

Please provide a clear and ${messageStyle} commit message following the format above.`;
    }

    async generateCommitMessage(
        diff: string,
        language: string,
        messageStyle: MessageStyle,
        template?: TemplateInfo
    ): Promise<string | undefined> {
        try {
            const getPrompt = await this.getPromptForLanguage(language);
            const systemPrompt = getPrompt('system');
            const userPrompt = await this.createCommitPrompt(diff, language, messageStyle, template);

            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.2,
                max_tokens: 500
            });

            return response.choices[0].message.content || undefined;
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate commit message: ${error.message}`);
            console.error('Error generating commit message:', error);
            return undefined;
        }
    }

    async generatePRContent(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo,
        initialTitle?: string,
        initialBody?: string
    ): Promise<{ title: string; body: string } | undefined> {
        try {
            const getPrompt = await this.getPromptForLanguage(language);
            const systemPrompt = getPrompt('system');

            // PRの差分情報を文字列化
            const diffSummary = `
変更ファイル:
${diff.files.map(file => `- ${file.filename} (追加: ${file.additions}, 削除: ${file.deletions})`).join('\n')}

詳細な変更:
${diff.files.map(file => `
[${file.filename}]
${file.patch}`).join('\n')}
`;

            let userPrompt;
            if (template) {
                userPrompt = `
Based on the following template and Git diff, generate a pull request:

Template:
${template.content}

Git diff:
${diffSummary}

Please follow the template format strictly.`;
            } else {
                userPrompt = getPrompt('prBody').replace('{{diff}}', diffSummary);
            }

            // タイトルと本文を別々に生成
            const [titleResponse, bodyResponse] = await Promise.all([
                this.openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: template ? userPrompt : getPrompt('prTitle').replace('{{diff}}', diffSummary) }
                    ],
                    temperature: 0.2,
                    max_tokens: 100
                }),
                this.openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.2,
                    max_tokens: 1000
                })
            ]);

            const title = titleResponse.choices[0].message.content?.trim();
            let body = bodyResponse.choices[0].message.content?.trim();

            if (!title || !body) {
                throw new Error('Generated title or body is empty');
            }

            // 本文を行に分割して処理
            const lines = body.split('\n');
            const formattedLines: string[] = [];
            let inList = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
                
                // 見出しの処理
                if (line.startsWith('#')) {
                    if (formattedLines.length > 0) {
                        formattedLines.push('');  // 見出し前の空行
                    }
                    formattedLines.push(line);
                    formattedLines.push('');  // 見出し後の空行
                    continue;
                }

                // 箇条書きの処理
                if (line.startsWith('*') || line.startsWith('-')) {
                    if (!inList && formattedLines.length > 0) {
                        formattedLines.push('');  // リスト開始前の空行
                    }
                    formattedLines.push(line);
                    inList = true;
                    
                    // リストが終わる場合は空行を追加
                    if (!(nextLine.startsWith('*') || nextLine.startsWith('-'))) {
                        formattedLines.push('');
                        inList = false;
                    }
                    continue;
                }

                // 通常の段落の処理
                if (line !== '') {
                    if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
                        formattedLines.push('');  // 段落間の空行
                    }
                    formattedLines.push(line);
                    if (nextLine !== '') {
                        formattedLines.push('');  // 段落後の空行
                    }
                }
            }

            // 行を結合して余分な空行を削除
            body = formattedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n\n';

            // Issue関連付けがある場合は説明文の先頭に追加
            const finalBody = initialBody ? `${initialBody}\n\n${body}` : body;

            return {
                title: initialTitle || title,
                body: finalBody
            };
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate PR content: ${error.message}`);
            console.error('Error generating PR content:', error);
            return undefined;
        }
    }
}