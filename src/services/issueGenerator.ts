import * as vscode from 'vscode';
import { OpenAIService, OpenAIServiceFactory } from './openai';
import { GitService, GitServiceFactory } from './git';
import { GitHubService, GitHubServiceFactory } from './github';
import { BaseService, BaseServiceFactory } from './base';
import { ServiceConfig } from '../types';
import {
    IssueType,
    IssueGenerationParams,
    GeneratedIssueContent
} from '../types/issue';
import { ErrorHandler } from '../infrastructure/error';

interface FileAnalysis {
    path: string;
    content?: string;
    type?: string;
    error?: string;
}

/**
 * Service for generating GitHub issues using AI
 * 
 * Analyzes repository files and generates appropriate GitHub issues
 * with AI-powered content generation.
 * 
 * @example
 * ```typescript
 * const service = await IssueGeneratorService.initialize();
 * const preview = await service.generatePreview({
 *   type: issueType,
 *   description: 'Bug description',
 *   files: ['src/file.ts']
 * });
 * ```
 */
export class IssueGeneratorService extends BaseService {
    // Unified 200K token limit for GPT-5.1 migration
    private static readonly MAX_TOKENS = 200 * 1000;

    constructor(
        private readonly openai: OpenAIService,
        private readonly github: GitHubService,
        private readonly git: GitService,
        config?: Partial<ServiceConfig>
    ) {
        super(config);
    }

    /**
     * Get all tracked files in the repository
     * 
     * @returns Array of tracked file paths
     */
    async getTrackedFiles(): Promise<string[]> {
        return this.git.getTrackedFiles();
    }

    /**
     * Get available issue types
     * 
     * Returns a list of issue types that can be generated (task, bug, feature, etc.)
     * 
     * @returns Array of issue type configurations
     * 
     * @example
     * ```typescript
     * const types = service.getAvailableTypes();
     * types.forEach(type => console.log(type.label));
     * ```
     */
    getAvailableTypes(): IssueType[] {
        const useEmoji = this.config.useEmoji || false;

        return [
            {
                label: useEmoji ? '📋 Task' : 'Task',
                description: 'General task or improvement',
                type: 'task'
            },
            {
                label: useEmoji ? '🐛 Bug Report' : 'Bug Report',
                description: 'Report a bug',
                type: 'bug'
            },
            {
                label: useEmoji ? '✨ Feature Request' : 'Feature Request',
                description: 'Request a new feature',
                type: 'feature'
            },
            {
                label: useEmoji ? '📝 Documentation' : 'Documentation',
                description: 'Documentation improvement',
                type: 'docs'
            },
            {
                label: useEmoji ? '🔧 Refactoring' : 'Refactoring',
                description: 'Code improvement',
                type: 'refactor'
            }
        ];
    }

    private async generateTitle(type: string, description: string): Promise<string> {
        try {
            this.logger.debug(`Generating title for ${type}`);
            
            const title = await this.openai.createChatCompletion({
                prompt: `Create a concise title (maximum 50 characters) in ${this.config.language || 'english'} for this ${type} based on the following description:\n\n${description}\n\nRequirements:\n- Must be in ${this.config.language || 'english'}\n- Maximum 50 characters\n- Clear and descriptive\n- No technical jargon unless necessary`,
                temperature: 0.1,
                maxTokens: 50
            });

            this.logger.info('Title generated successfully');
            return title || description.slice(0, 50);
        } catch (error) {
            this.logger.error('Failed to generate title', error);
            this.showError('Failed to generate title', error);
            return description.slice(0, 50);
        }
    }

    private async analyzeFiles(files: string[]): Promise<FileAnalysis[]> {
        this.logger.info(`Analyzing ${files.length} files`);
        const analyses: FileAnalysis[] = [];
        const maxPreviewLength = 1000; // ファイルごとのプレビュー最大文字数
        let totalTokens = 0; // トークン数をトラッキング

        for (const file of files) {
            try {
                const fileUri = vscode.Uri.file(file);
                const fileContent = await vscode.workspace.fs.readFile(fileUri);
                const decoder = new TextDecoder();
                let content = decoder.decode(fileContent);

                // ファイル拡張子から種類を判定
                const extension = file.split('.').pop()?.toLowerCase();
                const type = this.getFileType(extension);

                // ファイルの内容を要約（最初の1000文字まで）
                if (content.length > maxPreviewLength) {
                    content = content.substring(0, maxPreviewLength) + '\n... (content truncated)';
                }

                // トークン数を推定（1トークン≈4文字）
                const estimatedTokens = Math.ceil(content.length / 4);

                // トークン制限を超える場合は制限
                if (totalTokens + estimatedTokens > IssueGeneratorService.MAX_TOKENS) {
                    this.logger.warning(`Token limit reached, omitting content for ${file}`);
                    content = '... (content omitted due to token limit)';
                } else {
                    totalTokens += estimatedTokens;
                }

                analyses.push({
                    path: file,
                    content: content,
                    type: type
                });
            } catch (error) {
                this.logger.warning(`Failed to analyze file ${file}`, error);
                analyses.push({
                    path: file,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        this.logger.info(`File analysis complete: ${analyses.length} files analyzed, ${totalTokens} tokens`);
        return analyses;
    }

    private getFileType(extension: string | undefined): string {
        const typeMap: { [key: string]: string } = {
            ts: 'TypeScript',
            js: 'JavaScript',
            jsx: 'React JavaScript',
            tsx: 'React TypeScript',
            css: 'CSS',
            scss: 'SCSS',
            html: 'HTML',
            json: 'JSON',
            md: 'Markdown',
            py: 'Python',
            java: 'Java',
            cpp: 'C++',
            c: 'C',
            go: 'Go',
            rs: 'Rust',
            php: 'PHP',
            rb: 'Ruby'
        };

        return extension ? (typeMap[extension] || 'Unknown') : 'Unknown';
    }

    private formatAnalysisResult(analyses: FileAnalysis[]): string {
        let result = '# Repository Analysis\n\n';

        // ファイルタイプごとにグループ化
        const groupedByType = analyses.reduce((groups: { [key: string]: FileAnalysis[] }, analysis) => {
            const type = analysis.type || 'Unknown';
            if (!groups[type]) {
                groups[type] = [];
            }
            groups[type].push(analysis);
            return groups;
        }, {});

        // 各タイプのファイルをまとめて表示
        for (const [type, files] of Object.entries(groupedByType)) {
            result += `## ${type} Files\n\n`;
            for (const file of files) {
                result += `### ${file.path}\n\n`;
                if (file.error) {
                    result += `Error: ${file.error}\n\n`;
                } else if (file.content) {
                    result += '```' + (type.toLowerCase().includes('typescript') ? 'typescript' : '') + '\n';
                    result += file.content;
                    result += '\n```\n\n';
                }
            }
        }

        return result;
    }

    /**
     * Generate a preview of the issue content
     * 
     * Analyzes selected files and generates issue title and body using AI.
     * 
     * @param params - Issue generation parameters
     * @returns Generated issue content (title and body)
     * 
     * @example
     * ```typescript
     * const preview = await service.generatePreview({
     *   type: { type: 'bug', label: 'Bug Report', description: '...' },
     *   description: 'Application crashes on startup',
     *   files: ['src/main.ts']
     * });
     * ```
     */
    async generatePreview(params: IssueGenerationParams): Promise<GeneratedIssueContent> {
        try {
            this.logger.info('Generating issue preview');
            
            // ファイル解析
            const fileAnalyses = params.files && params.files.length > 0
                ? await this.analyzeFiles(params.files)
                : [];

            if (fileAnalyses.length > 0) {
                const estimatedTokens = Math.ceil(fileAnalyses.reduce((sum, analysis) => 
                    sum + (analysis.content?.length || 0), 0) / 4);
                if (estimatedTokens > IssueGeneratorService.MAX_TOKENS) {
                    this.logger.warning(
                        `Analysis content exceeds 100K tokens limit (estimated ${Math.floor(estimatedTokens/1000)}K tokens). Some content will be truncated.`
                    );
                }
            }
            
            const analysisResult = this.formatAnalysisResult(fileAnalyses);
            const useEmoji = this.config.useEmoji || false;
            const emojiInstruction = useEmoji ? 'Use emojis for section headers and key points.' : 'DO NOT use any emojis in the content.';
            const customMessage = vscode.workspace.getConfiguration('otakCommitter').get<string>('customMessage') || '';
            const customInstruction = customMessage ? `\n\nAdditional requirements: ${customMessage}` : '';

            const body = await this.openai.createChatCompletion({
                prompt: `Generate a GitHub issue in recommended format for the following analysis and description. Include appropriate sections like Background, Problem Statement, Expected Behavior, Steps to Reproduce (if applicable), and Additional Context. Keep the technical details but organize them well.\n\n${emojiInstruction}${customInstruction}\n\nRepository Analysis:\n${analysisResult}\n\nUser Description: ${params.description}`,
                maxTokens: 1000,
                temperature: 0.1
            });

            if (!body) {
                this.logger.error('Failed to generate issue body content');
                throw new Error('Failed to generate content');
            }

            const title = await this.generateTitle(params.type.type, params.description);

            this.logger.info('Issue preview generated successfully');
            return { title, body };
        } catch (error) {
            this.logger.error('Failed to generate preview', error);
            throw new Error(`Failed to generate preview: ${error}`);
        }
    }

    /**
     * Create a GitHub issue with the generated content
     * 
     * @param content - The generated issue content
     * @param type - The issue type
     * @returns The URL of the created issue or undefined if creation fails
     * 
     * @example
     * ```typescript
     * const url = await service.createIssue(preview, issueType);
     * if (url) {
     *   console.log('Issue created:', url);
     * }
     * ```
     */
    async createIssue(content: GeneratedIssueContent, type: IssueType): Promise<string | undefined> {
        try {
            this.logger.info(`Creating issue: ${content.title}`);
            const useEmoji = this.config.useEmoji || false;

            const issueTitle = useEmoji 
                ? `${type.label.split(' ')[0]} ${content.title}`
                : `[${type.type}] ${content.title}`;

            const issue = await this.github.createIssue({
                title: issueTitle,
                body: content.body
            });

            this.logger.info(`Issue created successfully: ${issue.html_url}`);
            return issue.html_url;
        } catch (error) {
            this.logger.error('Failed to create issue', error);
            this.showError('Failed to create issue', error);
            return undefined;
        }
    }
}

/**
 * Factory for creating issue generator service instances
 * 
 * Handles initialization of all required services (OpenAI, GitHub, Git).
 */
export class IssueGeneratorServiceFactory extends BaseServiceFactory<IssueGeneratorService> {
    async create(config?: Partial<ServiceConfig>): Promise<IssueGeneratorService> {
        // GitHubの初期化を先に行い、認証状態を確認
        const github = await GitHubServiceFactory.initialize();
        if (!github) {
            vscode.window.showErrorMessage('GitHubの操作にはGitHub認証が必要です。認証を行ってから再度お試しください。');
            throw new Error('GitHub認証が必要です');
        }

        // 認証が成功したら他のサービスを初期化
        const [openai, git] = await Promise.all([
            OpenAIServiceFactory.initialize(config),
            GitServiceFactory.initialize(config)
        ]);

        if (!openai || !git) {
            throw new Error('Failed to initialize required services');
        }

        // GitHub認証が完了している状態でサービスを作成
        return new IssueGeneratorService(openai, github, git, config);
    }

    static async initialize(config?: Partial<ServiceConfig>): Promise<IssueGeneratorService | undefined> {
        try {
            const factory = new IssueGeneratorServiceFactory();
            return await factory.create(config);
        } catch (error) {
            ErrorHandler.handle(error, {
                operation: 'Initialize Issue Generator service',
                component: 'IssueGeneratorServiceFactory'
            });
            return undefined;
        }
    }
}