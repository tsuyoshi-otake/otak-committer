import * as vscode from 'vscode';
import { Configuration, OpenAIApi } from 'openai';
import { getAsianPrompt } from '../languages/asian';
import { getEuropeanPrompt } from '../languages/european';
import { getMiddleEasternPrompt } from '../languages/middleEastern';
import { PromptType } from '../types/language';
import { MessageStyle } from '../types/messageStyle';
import { PullRequestDiff } from '../types/github';

export class OpenAIService {
    private openai: OpenAIApi;

    constructor(private apiKey: string) {
        const configuration = new Configuration({
            apiKey: this.apiKey
        });
        this.openai = new OpenAIApi(configuration);
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
        const config = vscode.workspace.getConfiguration('otakCommitter.openai');
        const apiKey = config.get<string>('apiKey');

        if (!apiKey) {
            await OpenAIService.showAPIKeyPrompt();
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
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            return response.data.choices[0].message?.content;
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

        const userPrompt = getPrompt('pr').replace('{{diff}}', diffSummary);

        try {
            const response = await this.openai.createChatCompletion({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            });

            const content = response.data.choices[0].message?.content;
            if (!content) {
                return undefined;
            }

            // タイトルと説明文を抽出
            const titleMatch = content.match(/Title:\s*(.+?)(?=\n\nBody:|$)/s);
            const bodyMatch = content.match(/Body:\s*(.+?)$/s);

            if (titleMatch && bodyMatch) {
                const title = titleMatch[1].trim();
                const body = bodyMatch[1].trim();

                // Issue関連付けがある場合は説明文の先頭に追加
                const finalBody = initialBody ? `${initialBody}\n\n${body}` : body;

                return {
                    title: initialTitle || title,
                    body: finalBody
                };
            }

            return undefined;
        } catch (error: any) {
            throw new Error(`Failed to generate PR content: ${error.message}`);
        }
    }
}