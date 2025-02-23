import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

export class OpenAIService {
    private client: AxiosInstance;

    constructor(private apiKey: string) {
        // プロキシ設定の取得
        const proxyUrl = vscode.workspace.getConfiguration('http').get<string>('proxy');
        
        this.client = axios.create({
            baseURL: 'https://api.openai.com/v1',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000, // 30秒
            ...(proxyUrl ? { httpsAgent: new HttpsProxyAgent(proxyUrl) } : {})
        });
    }

    /**
     * OpenAI APIキーの設定を促す
     */
    static async showAPIKeyPrompt(): Promise<boolean> {
        const response = await vscode.window.showWarningMessage(
            'OpenAI API Key is not configured. Would you like to configure it now?',
            'Yes',
            'No'
        );

        if (response === 'Yes') {
            await vscode.commands.executeCommand('workbench.action.openSettings', 'otakCommitter.openaiApiKey');
            return true;
        }
        return false;
    }

    /**
     * OpenAIサービスのインスタンスを初期化
     */
    static async initialize(): Promise<OpenAIService | undefined> {
        const config = vscode.workspace.getConfiguration('otakCommitter');
        const apiKey = config.get<string>('openaiApiKey');

        if (!apiKey) {
            await OpenAIService.showAPIKeyPrompt();
            return undefined;
        }

        return new OpenAIService(apiKey);
    }

    /**
     * メッセージを生成
     */
    async createMessage(prompt: string, maxTokens: number): Promise<string | undefined> {
        try {
            const response = await this.client.post('/chat/completions', {
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that creates commit messages and pull request descriptions.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: maxTokens,
                temperature: 0.2,
                top_p: 0.95,
                presence_penalty: 0,
                frequency_penalty: 0
            });

            return response.data.choices[0]?.message?.content;
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.error?.message || error.message;
                throw new Error(`OpenAI API Error: ${message}`);
            }
            throw error;
        }
    }
}