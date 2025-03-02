import * as vscode from 'vscode';
import { GitServiceFactory } from '../services/git';
import { OpenAIService } from '../services/openai';
import { MessageStyle } from '../types/messageStyle';

export async function generateCommit(): Promise<void> {
    try {
        console.log('Starting generateCommit command...');

        // Git差分の取得
        console.log('Initializing GitService...');
        const git = await GitServiceFactory.initialize();
        if (!git) {
            return;
        }

        // テンプレートを探す
        console.log('Looking for commit message templates...');
        const templates = await git.findTemplates();

        console.log('Getting Git diff...');
        const diff = await git.getDiff();
        if (!diff) {
            console.log('No changes to commit');
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Failed to generate commit: No changes to commit',
                cancellable: false
            }, async () => new Promise<void>(resolve => setTimeout(resolve, 3000)));
            return;
        }

        // OpenAI APIの初期化
        console.log('Initializing OpenAIService...');
        const openai = await OpenAIService.initialize();
        if (!openai) {
            console.error('Failed to initialize OpenAIService');
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Failed to generate commit: OpenAI service initialization failed...',
                cancellable: false
            }, async () => new Promise<void>(resolve => setTimeout(resolve, 3000)));
            return;
        }

        // 進捗表示
        console.log('Starting commit message generation...');
        const message = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating commit message...',
            cancellable: false
        }, async () => {
            // 設定を取得
            const config = vscode.workspace.getConfiguration('otakCommitter');
            const language = config.get<string>('language') || 'english';
            const messageStyle = config.get<MessageStyle>('messageStyle') || 'normal';

            console.log(`Using language: ${language}, style: ${messageStyle}`);

            // コミットメッセージを生成
            const generatedMessage = await openai.generateCommitMessage(diff, language, messageStyle, templates.commit);
            
            // generatedMessageがundefinedの場合は空文字列を返す
            if (!generatedMessage) {
                return '';
            }

            // ```を削除
            return generatedMessage.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim();
        });

        if (!message) {
            console.error('Failed to generate commit message: message is empty');
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Failed to generate commit: Empty message received',
                cancellable: false
            }, async () => new Promise<void>(resolve => setTimeout(resolve, 3000)));
            return;
        }

        // Gitエクステンションを取得
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
            console.error('Git extension not found');
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Failed to generate commit: Git extension is not available',
                cancellable: false
            }, async () => new Promise<void>(resolve => setTimeout(resolve, 3000)));
            return;
        }

        // GitエクステンションのAPIを取得
        const gitApi = gitExtension.exports.getAPI(1);
        const repository = gitApi.repositories[0];
        if (!repository) {
            console.error('No Git repository found');
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Failed to generate commit: No Git repository found',
                cancellable: false
            }, async () => new Promise<void>(resolve => setTimeout(resolve, 3000)));
            return;
        }

        // 生成されたメッセージをソースコントロールのインプットボックスに設定
        console.log('Setting generated message to source control input');
        repository.inputBox.value = message;

        console.log('Successfully set commit message');
        void vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Commit message has been generated'
        }, async () => {
            return new Promise<void>(resolve => {
                setTimeout(resolve, 3000);
            });
        });
    } catch (error: any) {
        console.error('Error in generateCommit:', error);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Failed to generate commit: ${error.message}`,
            cancellable: false
        }, async () => new Promise<void>(resolve => setTimeout(resolve, 3000)));
    }
}