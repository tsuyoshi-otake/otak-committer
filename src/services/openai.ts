import * as vscode from 'vscode';
import OpenAI from 'openai';
import { getAsianPrompt } from '../languages/asian';
import { getEuropeanPrompt } from '../languages/european';
import { getMiddleEasternPrompt } from '../languages/middleEastern';
import { PromptType } from '../types/language';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';

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

        return new OpenAIService(apiKey);
    }

    private getPromptForLanguage(language: string): (type: PromptType) => string {
        switch (language) {
            case 'japanese':
            case 'korean':
            case 'chinese':
                return getAsianPrompt;
            case 'arabic':
            case 'hebrew':
                return getMiddleEasternPrompt;
            default:
                return getEuropeanPrompt;
        }
    }

    async generateCommitMessage(
        diff: string,
        language: string,
        messageStyle: MessageStyle
    ): Promise<string | undefined> {
        const getPrompt = this.getPromptForLanguage(language);
        const systemPrompt = getPrompt('system');
        const userPrompt = getPrompt('commit').replace('{{style}}', messageStyle).replace('{{diff}}', diff);

        try {
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
            throw new Error(`Failed to generate commit message: ${error.message}`);
        }
    }

    async generatePRContent(
        diff: PullRequestDiff,
        language: string,
        initialTitle?: string,
        initialBody?: string
    ): Promise<{ title: string; body: string } | undefined> {
        const getPrompt = this.getPromptForLanguage(language);
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

        // タイトルと本文を別々に生成
        try {
            const [titleResponse, bodyResponse] = await Promise.all([
                this.openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: getPrompt('prTitle').replace('{{diff}}', diffSummary) }
                    ],
                    temperature: 0.2,
                    max_tokens: 100
                }),
                this.openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: getPrompt('prBody').replace('{{diff}}', diffSummary) }
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
            throw new Error(`Failed to generate PR content: ${error.message}`);
        }
    }
}