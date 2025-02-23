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
            // 動的に言語モジュールをインポート
            try {
                const module = await import(`../languages/${language}.js`);
                const promptFunction = module[`get${language.charAt(0).toUpperCase() + language.slice(1)}Prompt`];
                if (promptFunction) {
                    return promptFunction;
                }
            } catch (importError) {
                console.warn(`Language module not found for ${language}, falling back to English:`, importError);
            }

            // フォールバック：英語
            const { getEnglishPrompt } = await import('../languages/english.js');
            return getEnglishPrompt;
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
            return `Based on the following template and Git diff, generate a commit message:

Template:
${template.content}

Git diff:
${diff}

Please follow the template format strictly without any leading newlines.`;
        }

        // テンプレートがない場合はPrefixを使用
        const prefixDescriptions = COMMIT_PREFIXES.map(prefix => {
            const desc = prefix.description[language as keyof CommitPrefix['description']] || prefix.description.english;
            return `${prefix.prefix}: ${desc}`;
        }).join('\n');

        return `Generate a commit message in ${language} for the following Git diff.
Use one of these prefixes:

${prefixDescriptions}

The commit message should follow this format without any leading newlines:
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
                model: 'chatgpt-4o-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 100
            });

            let message = response.choices[0].message.content;
            if (message) {
                // 先頭の空行を削除
                message = message.trimStart();
                return message;
            }
            return undefined;
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate commit message: ${error.message}`);
            console.error('Error generating commit message:', error);
            return undefined;
        }
    }

    private async generateDiffSummary(diff: PullRequestDiff): Promise<string> {
        return `Changed files:
${diff.files.map(file => `- ${file.filename} (additions: ${file.additions}, deletions: ${file.deletions})`).join('\n')}

Detailed changes:
${diff.files.map(file => `
[${file.filename}]
${file.patch}`).join('\n')}`;
    }

    private formatPRBody(body: string): string {
        const lines = body.split('\n');
        const formattedLines: string[] = [];
        let inList = false;
        let hasStartedContent = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';

            if (!hasStartedContent && line !== '' && !line.startsWith('##') && !line.startsWith('*') && !line.startsWith('-')) {
                continue;
            }

            if (!hasStartedContent && (line.startsWith('#') || line.startsWith('*') || line.startsWith('-'))) {
                hasStartedContent = true;
            }

            if (line.startsWith('#')) {
                if (formattedLines.length > 0) {
                    formattedLines.push('');
                }
                formattedLines.push(line);
                formattedLines.push('');
                continue;
            }

            if (line.startsWith('*') || line.startsWith('-')) {
                if (!inList && formattedLines.length > 0) {
                    formattedLines.push('');
                }
                formattedLines.push(line);
                inList = true;
                
                if (!(nextLine.startsWith('*') || nextLine.startsWith('-'))) {
                    formattedLines.push('');
                    inList = false;
                }
                continue;
            }

            if (hasStartedContent && line !== '') {
                if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
                    formattedLines.push('');
                }
                formattedLines.push(line);
                if (nextLine !== '') {
                    formattedLines.push('');
                }
            }
        }

        return formattedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n\n';
    }

    private cleanMarkdown(text: string): string {
        return text
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/`/g, '')
            .replace(/#/g, '')
            .trim();
    }

    async generatePRTitle(
        diff: PullRequestDiff,
        language: string
    ): Promise<string | undefined> {
        try {
            const getPrompt = await this.getPromptForLanguage(language);
            const systemPrompt = getPrompt('system');
            const diffSummary = await this.generateDiffSummary(diff);

            const titleResponse = await this.openai.chat.completions.create({
                model: 'chatgpt-4o-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: getPrompt('prTitle').replace('{{diff}}', diffSummary) }
                ],
                temperature: 0.1,
                max_tokens: 100
            });

            const title = titleResponse.choices[0].message.content?.trim();
            if (!title) {
                throw new Error('Generated title is empty');
            }

            return this.cleanMarkdown(title);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate PR title: ${error.message}`);
            console.error('Error generating PR title:', error);
            return undefined;
        }
    }

    async generatePRBody(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo
    ): Promise<string | undefined> {
        try {
            const getPrompt = await this.getPromptForLanguage(language);
            const systemPrompt = getPrompt('system');
            const diffSummary = await this.generateDiffSummary(diff);

            const userPrompt = template
                ? `Based on the following template and Git diff, generate a pull request:

Template:
${template.content}

Git diff:
${diffSummary}

Please follow the template format strictly.`
                : getPrompt('prBody').replace('{{diff}}', diffSummary);

            const bodyResponse = await this.openai.chat.completions.create({
                model: 'chatgpt-4o-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1,
                max_tokens: 1000
            });

            let body = bodyResponse.choices[0].message.content?.trim();
            if (!body) {
                throw new Error('Generated body is empty');
            }

            body = this.formatPRBody(body);
            return body;
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate PR body: ${error.message}`);
            console.error('Error generating PR body:', error);
            return undefined;
        }
    }

    async generatePRContent(
        diff: PullRequestDiff,
        language: string,
        template?: TemplateInfo
    ): Promise<{ title: string; body: string } | undefined> {
        try {
            const [title, body] = await Promise.all([
                this.generatePRTitle(diff, language),
                this.generatePRBody(diff, language, template)
            ]);

            if (!title || !body) {
                throw new Error('Failed to generate PR content');
            }

            return {
                title: title.trimStart(),
                body: body.trimStart()
            };
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate PR content: ${error.message}`);
            console.error('Error generating PR content:', error);
            return undefined;
        }
    }
}