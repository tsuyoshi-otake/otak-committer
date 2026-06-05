import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { ConfigManager } from '../infrastructure/config/ConfigManager';
import { t } from '../i18n/index.js';
import { BranchSelection, BranchSelector } from '../services/branch';
import { GitServiceFactory } from '../services/git';
import { GitHubService, GitHubServiceFactory } from '../services/github';
import { OpenAIService } from '../services/openai';
import { confirmProceedWithPotentialSecrets } from '../services/secretConfirmation';
import { PullRequestDiff, TemplateInfo } from '../types';
import { ServiceError } from '../types/errors';
import { detectPotentialSecrets } from '../utils';
import { createPRWithDraftFallback } from './pr.creation';
import { handleCreatePRError } from './pr.error';
import { selectIssue, selectPRType } from './pr.input';
import { showPRPreview } from './pr.preview';

type ProgressRunner = <T>(title: string, task: () => Promise<T>) => Promise<T>;
type PreviewFile = { uri: vscode.Uri; document: vscode.TextDocument };
type PRContent = { title: string; body: string };

interface PRGenerationWorkflowOptions {
    config: Pick<ConfigManager, 'get'>;
    logger: Logger;
    storageUri: vscode.Uri;
    initializeOpenAI: () => Promise<OpenAIService | undefined>;
    withProgress: ProgressRunner;
    setPreviewFile: (previewFile: PreviewFile) => void;
    openExternalUrl: (url: string) => Promise<void>;
}

/**
 * Run the end-to-end pull request generation workflow
 *
 * @param options - Workflow dependencies, configuration, and UI hooks
 * @returns true if a pull request was successfully created, false otherwise
 */
export async function runPRGenerationWorkflow({
    config,
    logger,
    storageUri,
    initializeOpenAI,
    withProgress,
    setPreviewFile,
    openExternalUrl,
}: PRGenerationWorkflowOptions): Promise<boolean> {
    const github = await initializeGitHub(logger);
    if (!github) {
        return false;
    }

    const branches = await selectBranches(github, logger);
    if (!branches) {
        return false;
    }

    const issueNumber = await selectIssue(github, logger);
    const templates = await findTemplates(logger);
    const diff = await getBranchDiff(github, branches, logger);
    if (!diff || !(await confirmIfPotentialSecrets(diff, logger))) {
        return false;
    }

    const openai = await initializeOpenAI();
    if (!openai) {
        return false;
    }

    const prContent = await generatePRContent(
        openai,
        diff,
        templates.pr,
        config,
        logger,
        withProgress,
    );
    if (!prContent) {
        return false;
    }

    if (!(await showPreview(prContent, issueNumber, storageUri, setPreviewFile, logger))) {
        return false;
    }

    const prType = await selectPRType(logger);
    if (!prType) {
        return false;
    }

    await createPR(
        github,
        branches,
        prContent,
        issueNumber,
        prType.value,
        logger,
        withProgress,
        openExternalUrl,
    );
    return true;
}

async function initializeGitHub(logger: Logger): Promise<GitHubService | undefined> {
    logger.debug('Initializing GitHub service');
    const github = await GitHubServiceFactory.initialize();
    if (!github) {
        logger.error('Failed to initialize GitHub service');
        return undefined;
    }
    return github;
}

async function selectBranches(
    github: GitHubService,
    logger: Logger,
): Promise<BranchSelection | undefined> {
    logger.debug('Selecting branches for PR');
    const branches = await BranchSelector.selectBranches(github);
    if (!branches) {
        logger.info('Branch selection cancelled');
        return undefined;
    }
    logger.debug(`Selected branches: ${branches.base} <- ${branches.compare}`);
    return branches;
}

async function findTemplates(
    logger: Logger,
): Promise<{ commit?: TemplateInfo; pr?: TemplateInfo }> {
    logger.debug('Looking for PR templates');
    const git = await GitServiceFactory.initialize();
    return git ? git.findTemplates() : {};
}

async function getBranchDiff(
    github: GitHubService,
    branches: BranchSelection,
    logger: Logger,
): Promise<PullRequestDiff | undefined> {
    logger.debug(`Getting diff between ${branches.base} and ${branches.compare}`);

    try {
        const diff = await github.getBranchDiffDetails(branches.base, branches.compare);
        if (!diff.files.length) {
            logger.info('No changes found between branches');
            vscode.window.showErrorMessage(t('messages.noChangesBetweenBranches'));
            return undefined;
        }
        return diff;
    } catch (error) {
        logger.error('Failed to get branch diff', error);
        throw new ServiceError(t('errors.failedToGetBranchDiff'), 'github', {
            originalError: error,
        });
    }
}

async function generatePRContent(
    openai: OpenAIService,
    diff: PullRequestDiff,
    template: TemplateInfo | undefined,
    config: Pick<ConfigManager, 'get'>,
    logger: Logger,
    withProgress: ProgressRunner,
): Promise<PRContent | undefined> {
    logger.debug('Generating PR content with AI');

    const prContent = await withProgress(t('progress.analyzingChanges'), async () => {
        const language = config.get('language') || 'english';
        logger.debug(`Using language: ${language}`);
        return openai.generatePRContent(diff, language, template);
    });

    if (!prContent) {
        logger.warning('PR content generation returned empty');
        vscode.window.showErrorMessage(t('messages.failedToGeneratePR'));
        return undefined;
    }
    return prContent;
}

async function showPreview(
    prContent: PRContent,
    issueNumber: number | undefined,
    storageUri: vscode.Uri,
    setPreviewFile: (previewFile: PreviewFile) => void,
    logger: Logger,
): Promise<boolean> {
    logger.debug('Showing PR preview');

    const previewFile = await showPRPreview(prContent, issueNumber, storageUri);
    if (!previewFile) {
        logger.error('Failed to show preview');
        vscode.window.showErrorMessage(t('messages.failedToShowPreview'));
        return false;
    }

    setPreviewFile(previewFile);
    return true;
}

async function createPR(
    github: GitHubService,
    branches: BranchSelection,
    prContent: PRContent,
    issueNumber: number | undefined,
    isDraft: boolean,
    logger: Logger,
    withProgress: ProgressRunner,
    openExternalUrl: (url: string) => Promise<void>,
): Promise<void> {
    logger.debug('Creating PR on GitHub');

    const description = issueNumber
        ? `${prContent.body}\n\nResolves #${issueNumber}`
        : prContent.body;
    const prTypeStr = isDraft ? t('prTypes.draft') : t('prTypes.regular');
    const params = {
        base: branches.base,
        compare: branches.compare,
        title: prContent.title,
        body: description,
        issueNumber,
        draft: isDraft,
    };

    try {
        const result = await withProgress(t('progress.creatingPR', { prType: prTypeStr }), () =>
            createPRWithDraftFallback(github, params, isDraft, logger),
        );

        if (!result?.number) {
            throw new Error(t('errors.prCreationNoDetails'));
        }
        await showSuccessNotification(result, isDraft, openExternalUrl);
    } catch (error: unknown) {
        handleCreatePRError(error);
    }
}

async function confirmIfPotentialSecrets(diff: PullRequestDiff, logger: Logger): Promise<boolean> {
    const combined = diff.files.map((file) => file.patch).join('\n');
    const detection = detectPotentialSecrets(combined);
    return confirmProceedWithPotentialSecrets(
        detection,
        logger,
        'Potential secrets detected in PR diff',
    );
}

async function showSuccessNotification(
    pr: { number: number; html_url: string; draft?: boolean },
    isDraft: boolean,
    openExternalUrl: (url: string) => Promise<void>,
): Promise<void> {
    const prTypeStr = pr.draft || isDraft ? t('prTypes.draft') : t('prTypes.regular');
    const action = await vscode.window.showInformationMessage(
        t('messages.prCreatedSuccess', { prType: prTypeStr, number: pr.number }),
        t('buttons.openInBrowser'),
    );

    if (action === t('buttons.openInBrowser')) {
        await openExternalUrl(pr.html_url);
    }
}
