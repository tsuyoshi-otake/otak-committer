import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { IssueGeneratorServiceFactory } from '../services/issueGenerator';
import { selectFiles } from '../utils/fileSelector';
import { IssueType, GeneratedIssueContent } from '../types/issue';
import { ServiceError } from '../types/errors';
import { t } from '../i18n/index.js';

/**
 * Command for generating GitHub issues using AI
 * 
 * This command analyzes repository files and generates appropriate GitHub issues
 * using OpenAI's API. It handles the entire workflow from file selection to issue creation.
 * 
 * @example
 * ```typescript
 * const command = new IssueCommand(context);
 * await command.execute();
 * ```
 */
export class IssueCommand extends BaseCommand {
    private previewFile?: { uri: vscode.Uri; document: vscode.TextDocument };

    /**
     * Execute the issue generation command
     * 
     * Workflow:
     * 1. Authenticate with GitHub
     * 2. Initialize issue generator service
     * 3. Select issue type and files for analysis
     * 4. Generate preview and allow modifications
     * 5. Create issue on GitHub
     * 
     * @returns A promise that resolves when the command completes
     */
    async execute(): Promise<void> {
        try {
            this.logger.info('Starting issue generation');

            // Check GitHub authentication
            const authenticated = await this.authenticateGitHub();
            if (!authenticated) {
                return;
            }

            // Initialize issue generator service
            const service = await this.initializeService();
            if (!service) {
                return;
            }

            // Get issue type
            const issueType = await this.selectIssueType(service);
            if (!issueType) {
                return;
            }

            // Get files for analysis
            const selectedFiles = await this.selectFilesForAnalysis(service);
            if (selectedFiles === undefined) {
                return;
            }

            // Get issue description
            const description = await this.getIssueDescription();
            if (!description) {
                return;
            }

            // Generate and create issue
            await this.generateAndCreateIssue(service, issueType, description, selectedFiles);

            this.logger.info('Successfully completed issue generation');

        } catch (error) {
            this.handleError(error, 'generating issue');
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Authenticate with GitHub
     * 
     * @returns True if authentication successful, false otherwise
     */
    private async authenticateGitHub(): Promise<boolean> {
        this.logger.debug('Checking GitHub authentication');

        try {
            const session = await vscode.authentication.getSession(
                'github',
                ['repo'],
                { createIfNone: true }
            );

            if (!session) {
                this.logger.warning('GitHub authentication failed');
                vscode.window.showErrorMessage(t('messages.authRequired'));
                return false;
            }

            this.logger.debug('GitHub authentication successful');
            return true;

        } catch (error) {
            this.logger.error('Error during GitHub authentication', error);
            throw new ServiceError(
                'Failed to authenticate with GitHub',
                'github',
                { originalError: error }
            );
        }
    }

    /**
     * Initialize the issue generator service
     * 
     * @returns Issue generator service instance or undefined if initialization fails
     */
    private async initializeService() {
        this.logger.debug('Initializing IssueGeneratorService');

        try {
            const service = await IssueGeneratorServiceFactory.initialize();
            
            if (!service) {
                this.logger.error('Failed to initialize IssueGeneratorService');
                return undefined;
            }

            return service;

        } catch (error) {
            this.logger.error('Error initializing issue generator service', error);
            throw new ServiceError(
                'Failed to initialize issue generator service',
                'issue-generator',
                { originalError: error }
            );
        }
    }

    /**
     * Select issue type from available options
     * 
     * @param service - Issue generator service instance
     * @returns Selected issue type or undefined if cancelled
     */
    private async selectIssueType(service: any): Promise<IssueType | undefined> {
        this.logger.debug('Prompting user to select issue type');

        const issueTypes: IssueType[] = service.getAvailableTypes();
        const issueType = await vscode.window.showQuickPick<IssueType>(
            issueTypes,
            {
                placeHolder: t('quickPick.selectIssueType')
            }
        );

        if (!issueType) {
            this.logger.info('Issue type selection cancelled');
            return undefined;
        }

        this.logger.debug(`Selected issue type: ${issueType.type}`);
        return issueType;
    }

    /**
     * Select files for analysis
     * 
     * @param service - Issue generator service instance
     * @returns Array of selected file paths or undefined if cancelled
     */
    private async selectFilesForAnalysis(service: any): Promise<string[] | undefined> {
        this.logger.debug('Getting tracked files');

        try {
            const files = await service.getTrackedFiles();
            const selectedFiles = await selectFiles(files);

            if (selectedFiles.length === 0) {
                this.logger.info('No files selected');

                const confirm = await vscode.window.showInformationMessage(
                    t('messages.noFilesSelectedConfirm'),
                    t('buttons.yes'),
                    t('buttons.no')
                );

                if (confirm !== t('buttons.yes')) {
                    this.logger.info('User cancelled issue generation');
                    return undefined;
                }
            }

            this.logger.debug(`Selected ${selectedFiles.length} files for analysis`);
            return selectedFiles;

        } catch (error) {
            this.logger.error('Error selecting files', error);
            throw error;
        }
    }

    /**
     * Get issue description from user
     * 
     * @returns Issue description or undefined if cancelled
     */
    private async getIssueDescription(): Promise<string | undefined> {
        this.logger.debug('Prompting user for issue description');

        const description = await vscode.window.showInputBox({
            placeHolder: t('quickPick.enterIssueDescription'),
            prompt: t('quickPick.describeIssue')
        });

        if (!description) {
            this.logger.info('Issue description cancelled');
            return undefined;
        }

        this.logger.debug('Received issue description');
        return description;
    }

    /**
     * Generate preview and create issue with user feedback loop
     * 
     * @param service - Issue generator service instance
     * @param issueType - Selected issue type
     * @param description - Issue description
     * @param selectedFiles - Files selected for analysis
     */
    private async generateAndCreateIssue(
        service: any,
        issueType: IssueType,
        description: string,
        selectedFiles: string[]
    ): Promise<void> {
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: t('messages.generatingIssue'),
                cancellable: false
            },
            async (progress) => {
                try {
                    progress.report({ message: t('messages.analyzingRepository') });

                    // Generate initial preview
                    let preview = await service.generatePreview({
                        type: issueType,
                        description,
                        files: selectedFiles
                    });

                    // Preview and modification loop
                    let isContentFinalized = false;
                    while (!isContentFinalized) {
                        // Show preview
                        await this.showPreview(issueType, preview);

                        // Get user action
                        const action = await this.getUserAction();

                        if (!action || action === 'cancel') {
                            this.logger.info('Issue creation cancelled by user');
                            return;
                        }

                        if (action === 'create') {
                            isContentFinalized = true;
                        } else if (action === 'modify') {
                            // Get modification instructions
                            const modifications = await this.getModificationInstructions(progress);

                            if (modifications === undefined) {
                                // Escape pressed - finalize with current content
                                isContentFinalized = true;
                                continue;
                            }

                            if (!modifications.trim()) {
                                // Empty input - continue loop
                                continue;
                            }

                            progress.report({ message: t('messages.updatingContent') });

                            // Generate new preview with modifications
                            preview = await service.generatePreview({
                                type: issueType,
                                description: `${description}\n\nModification instructions: ${modifications}`,
                                files: selectedFiles
                            });
                        }
                    }

                    // Create issue
                    progress.report({ message: t('messages.creatingIssue') });
                    const issueUrl = await service.createIssue(preview, issueType);

                    if (issueUrl) {
                        await this.handleSuccessfulCreation(issueUrl);
                    }

                } catch (error) {
                    this.logger.error('Error during issue generation', error);
                    throw error;
                }
            }
        );
    }

    /**
     * Show markdown preview of the issue
     * 
     * @param issueType - Issue type
     * @param preview - Generated issue content
     */
    private async showPreview(issueType: IssueType, preview: GeneratedIssueContent): Promise<void> {
        this.logger.debug('Showing issue preview');

        try {
            const previewContent = `# Preview of ${issueType.label}\n\nTitle: ${preview.title}\n\n${preview.body}`;
            this.previewFile = await this.showMarkdownPreview(previewContent);

            if (!this.previewFile) {
                throw new Error('Failed to show preview');
            }

        } catch (error) {
            this.logger.error('Error showing preview', error);
            throw error;
        }
    }

    /**
     * Get user action for the preview
     * 
     * @returns User action: 'modify', 'create', or 'cancel'
     */
    private async getUserAction(): Promise<string | undefined> {
        this.logger.debug('Prompting user for action');

        const action = await vscode.window.showQuickPick([
            {
                label: `$(edit) ${t('issueActions.modify')}`,
                description: t('issueActions.modifyDescription'),
                action: 'modify'
            },
            {
                label: `$(check) ${t('issueActions.create')}`,
                description: t('issueActions.createDescription'),
                action: 'create'
            },
            {
                label: `$(close) ${t('issueActions.cancel')}`,
                description: t('issueActions.cancelDescription'),
                action: 'cancel'
            }
        ], {
            placeHolder: t('quickPick.chooseAction'),
            matchOnDescription: true,
            ignoreFocusOut: true
        });

        return action?.action;
    }

    /**
     * Get modification instructions from user
     * 
     * @param progress - Progress reporter
     * @returns Modification instructions or undefined if cancelled
     */
    private async getModificationInstructions(progress: any): Promise<string | undefined> {
        progress.report({ message: t('messages.waitingForModificationInput') });

        const modifications = await vscode.window.showInputBox({
            placeHolder: t('quickPick.enterModificationInstructions'),
            prompt: t('quickPick.describeModification')
        });

        return modifications;
    }

    /**
     * Handle successful issue creation
     * 
     * @param issueUrl - URL of the created issue
     */
    private async handleSuccessfulCreation(issueUrl: string): Promise<void> {
        this.logger.info(`Issue created successfully: ${issueUrl}`);

        // Close preview and cleanup
        await this.closePreviewTabs();
        await this.cleanupPreviewFiles();
        this.previewFile = undefined;

        // Show success message
        const response = await vscode.window.showInformationMessage(
            t('messages.issueCreatedSuccess'),
            t('buttons.openIssue')
        );

        if (response === t('buttons.openIssue')) {
            await this.openExternalUrl(issueUrl);
        }
    }

    /**
     * Open an external URL safely (http/https only).
     */
    private async openExternalUrl(url: string): Promise<void> {
        try {
            const uri = vscode.Uri.parse(url);
            const scheme = uri.scheme.toLowerCase();

            if (scheme !== 'https' && scheme !== 'http') {
                this.logger.warning(`Blocked non-http(s) URL: ${url}`);
                vscode.window.showErrorMessage('Cannot open non-http(s) URL.');
                return;
            }

            await vscode.env.openExternal(uri);
        } catch (error) {
            this.logger.warning('Failed to open external URL', error);
            vscode.window.showErrorMessage('Failed to open link.');
        }
    }

    /**
     * Show markdown preview in a temporary file
     * 
     * @param content - Markdown content to preview
     * @returns Preview file information or undefined if failed
     */
    private async showMarkdownPreview(content: string): Promise<{ uri: vscode.Uri; document: vscode.TextDocument } | undefined> {
        try {
            // Cleanup and recreate temp directory
            await this.cleanupPreviewFiles();
            const previewDir = this.getTempDir();
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(previewDir));

            // Create temp file with random name
            const tempUri = vscode.Uri.file(this.getPreviewFilePath());

            // Close previous preview
            await this.closePreviewTabs();

            // Write file
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(tempUri, encoder.encode(content));

            // Open document (without showing)
            const document = await vscode.workspace.openTextDocument(tempUri);

            // Show preview
            await vscode.commands.executeCommand('markdown.showPreview', tempUri);

            return { uri: tempUri, document };

        } catch (error) {
            this.logger.error('Error showing markdown preview', error);
            return undefined;
        }
    }

    /**
     * Close all preview tabs
     */
    private async closePreviewTabs(): Promise<void> {
        const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
        const closeTasks = tabs
            .filter(tab =>
                (tab.label.includes('Preview') || tab.label.includes('プレビュー')) &&
                tab.input instanceof vscode.TabInputWebview
            )
            .map(tab => vscode.window.tabGroups.close(tab));
        
        await Promise.all(closeTasks);
    }

    /**
     * Cleanup preview files
     */
    private async cleanupPreviewFiles(): Promise<void> {
        const previewDir = this.getTempDir();
        
        try {
            const stats = await vscode.workspace.fs.stat(vscode.Uri.file(previewDir));
            if (stats) {
                await vscode.workspace.fs.delete(vscode.Uri.file(previewDir), { recursive: true });
            }
        } catch (error) {
            // Ignore if directory doesn't exist
            if (error instanceof vscode.FileSystemError && error.code !== 'FileNotFound') {
                this.logger.error('Error cleaning up preview directory', error);
            }
        }
    }

    /**
     * Get temporary directory path
     * 
     * @returns Temporary directory path
     */
    private getTempDir(): string {
        return vscode.Uri.joinPath(
            vscode.Uri.file(require('os').tmpdir()),
            'otak-committer'
        ).fsPath;
    }

    /**
     * Generate preview file path
     * 
     * @returns Preview file path
     */
    private getPreviewFilePath(): string {
        const timestamp = Date.now();
        const random = require('crypto').randomBytes(4).toString('hex');
        return vscode.Uri.joinPath(
            vscode.Uri.file(this.getTempDir()),
            `issue-preview-${timestamp}-${random}.md`
        ).fsPath;
    }

    /**
     * Cleanup resources
     */
    private async cleanup(): Promise<void> {
        if (this.previewFile) {
            try {
                await this.closePreviewTabs();
                await this.cleanupPreviewFiles();
            } catch (error) {
                this.logger.error('Error cleaning up preview files', error);
            }
        }
    }
}
