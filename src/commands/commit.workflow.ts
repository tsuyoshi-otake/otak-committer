import type * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { ConfigManager } from '../infrastructure/config/ConfigManager';
import { t } from '../i18n/index.js';
import { GitService, GitServiceFactory } from '../services/git';
import { OpenAIService } from '../services/openai';
import { confirmProceedWithPotentialSecrets } from '../services/secretConfirmation';
import { TemplateInfo } from '../types';
import { MessageStyle } from '../types/enums/MessageStyle';
import { detectPotentialSecrets, sanitizeCommitMessage } from '../utils';
import { processCommitDiff } from './commit.diffProcessing';
import { setCommitMessageInSourceControl } from './commitMessageInput';
import { showTimedNotification } from './commandNotifications';

type ProgressRunner = <T>(title: string, task: () => Promise<T>) => Promise<T>;

interface CommitGenerationWorkflowOptions {
    context: Pick<vscode.ExtensionContext, 'globalState'>;
    config: Pick<ConfigManager, 'get'>;
    logger: Logger;
    signal?: AbortSignal;
    initializeOpenAI: () => Promise<OpenAIService | undefined>;
    withProgress: ProgressRunner;
}

export async function runCommitGenerationWorkflow({
    context,
    config,
    logger,
    signal,
    initializeOpenAI,
    withProgress,
}: CommitGenerationWorkflowOptions): Promise<boolean> {
    const git = await initializeGit(logger);
    if (!git) {
        return false;
    }

    const rawDiff = await getRawDiff(git, context.globalState, logger);
    if (!rawDiff || !(await confirmIfPotentialSecrets(rawDiff, logger))) {
        return false;
    }

    const openai = await initializeOpenAI();
    if (!openai) {
        return false;
    }

    const language = config.get('language') || 'english';
    const diffResult = await processCommitDiff({
        rawDiff,
        openai,
        language,
        signal,
        logger,
        withProgress,
    });

    const templates = await findTemplates(git, logger);
    const message = await generateMessage({
        openai,
        diff: diffResult.processedDiff,
        template: templates.commit,
        language,
        messageStyle: config.get('messageStyle') || MessageStyle.Normal,
        signal,
        logger,
        withProgress,
    });

    if (!message) {
        return false;
    }

    const finalMessage = appendTrailerIfEnabled(message, config);
    await setCommitMessageInSourceControl(finalMessage, logger);
    await showTimedNotification(t('messages.commitMessageGenerated'), 3000);
    return true;
}

async function initializeGit(logger: Logger): Promise<GitService | undefined> {
    const git = await GitServiceFactory.initialize();
    if (!git) {
        logger.error('Failed to initialize GitService');
        return undefined;
    }
    return git;
}

async function getRawDiff(
    git: GitService,
    globalState: vscode.Memento,
    logger: Logger,
): Promise<string | undefined> {
    logger.debug('Getting raw Git diff');
    const diff = await git.getRawDiff(globalState);

    if (!diff) {
        logger.info('No changes to commit');
        await showTimedNotification(t('messages.noChangesToCommit'), 3000);
        return undefined;
    }

    return diff;
}

async function findTemplates(
    git: GitService,
    logger: Logger,
): Promise<{ commit?: TemplateInfo; pr?: TemplateInfo }> {
    logger.debug('Looking for commit message templates');
    return git.findTemplates();
}

async function generateMessage({
    openai,
    diff,
    template,
    language,
    messageStyle,
    signal,
    logger,
    withProgress,
}: {
    openai: OpenAIService;
    diff: string;
    template?: TemplateInfo;
    language: string;
    messageStyle: MessageStyle | string;
    signal?: AbortSignal;
    logger: Logger;
    withProgress: ProgressRunner;
}): Promise<string | undefined> {
    logger.debug('Starting commit message generation');

    const message = await withProgress<string | undefined>(
        t('progress.generatingCommitMessage'),
        async () => {
            logger.debug(`Using language: ${language}, style: ${messageStyle}`);
            const generatedMessage = await openai.generateCommitMessage(
                diff,
                language,
                messageStyle,
                template,
                signal,
            );

            return generatedMessage ? sanitizeCommitMessage(generatedMessage) || '' : undefined;
        },
    );

    if (message === undefined) {
        return undefined;
    }

    if (!message) {
        logger.error('Failed to generate commit message: message is empty');
        await showTimedNotification(t('messages.emptyMessageReceived'), 3000);
        return undefined;
    }

    return message;
}

function appendTrailerIfEnabled(message: string, config: Pick<ConfigManager, 'get'>): string {
    const appendTrailer = config.get('appendCommitTrailer') ?? true;
    return appendTrailer ? `${message}\n\nCommit-Message-By: otak-committer` : message;
}

async function confirmIfPotentialSecrets(diff: string, logger: Logger): Promise<boolean> {
    const detection = detectPotentialSecrets(diff);
    return confirmProceedWithPotentialSecrets(
        detection,
        logger,
        'Potential secrets detected in commit generation target',
        'messages.commitGenerationSecretWarning',
    );
}
