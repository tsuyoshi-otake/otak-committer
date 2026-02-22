import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import { IssueType, GeneratedIssueContent } from '../types/issue';
import { IssueGeneratorService } from '../services/issueGenerator';
import { showMarkdownPreview } from '../utils/preview';

type PreviewFile = { uri: vscode.Uri; document: vscode.TextDocument };
type IssueAction = 'modify' | 'create' | 'cancel';

interface RunIssuePreviewLoopInput {
    service: IssueGeneratorService;
    issueType: IssueType;
    description: string;
    selectedFiles: string[];
    progress: vscode.Progress<{ message?: string }>;
    logger: Logger;
    onPreviewRendered: (previewFile: PreviewFile | undefined) => void;
}

async function renderIssuePreview(
    issueType: IssueType,
    preview: GeneratedIssueContent,
    logger: Logger,
): Promise<PreviewFile | undefined> {
    logger.debug('Showing issue preview');

    const previewContent = `# Preview of ${issueType.label}\n\nTitle: ${preview.title}\n\n${preview.body}`;
    const previewFile = await showMarkdownPreview(previewContent, 'issue');

    if (!previewFile) {
        throw new Error('Failed to show preview');
    }

    return previewFile;
}

async function promptIssueAction(): Promise<IssueAction | undefined> {
    const action = await vscode.window.showQuickPick(
        [
            {
                label: `$(edit) ${t('issueActions.modify')}`,
                description: t('issueActions.modifyDescription'),
                action: 'modify' as const,
            },
            {
                label: `$(check) ${t('issueActions.create')}`,
                description: t('issueActions.createDescription'),
                action: 'create' as const,
            },
            {
                label: `$(close) ${t('issueActions.cancel')}`,
                description: t('issueActions.cancelDescription'),
                action: 'cancel' as const,
            },
        ],
        {
            placeHolder: t('quickPick.chooseAction'),
            matchOnDescription: true,
            ignoreFocusOut: true,
        },
    );

    return action?.action;
}

async function promptModificationInstructions(
    progress: vscode.Progress<{ message?: string }>,
): Promise<string | undefined> {
    progress.report({ message: t('messages.waitingForModificationInput') });

    return vscode.window.showInputBox({
        placeHolder: t('quickPick.enterModificationInstructions'),
        prompt: t('quickPick.describeModification'),
    });
}

export async function runIssuePreviewLoop(
    input: RunIssuePreviewLoopInput,
): Promise<GeneratedIssueContent | undefined> {
    const { service, issueType, description, selectedFiles, progress, logger, onPreviewRendered } = input;

    progress.report({ message: t('messages.analyzingRepository') });
    let preview = await service.generatePreview({
        type: issueType,
        description,
        files: selectedFiles,
    });

    while (true) {
        const previewFile = await renderIssuePreview(issueType, preview, logger);
        onPreviewRendered(previewFile);

        const action = await promptIssueAction();
        if (!action || action === 'cancel') {
            logger.info('Issue creation cancelled by user');
            return undefined;
        }

        if (action === 'create') {
            return preview;
        }

        const modifications = await promptModificationInstructions(progress);
        if (modifications === undefined) {
            return preview;
        }
        if (!modifications.trim()) {
            continue;
        }

        progress.report({ message: t('messages.updatingContent') });
        preview = await service.generatePreview({
            type: issueType,
            description: `${description}\n\nModification instructions: ${modifications}`,
            files: selectedFiles,
        });
    }
}
