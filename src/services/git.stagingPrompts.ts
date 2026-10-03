import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import {
    chooseStagingMode,
    StagingMode,
    StagingPrompts,
    summarizePaths,
    WorkingTreeChanges,
} from './git.staging';

const ALWAYS_STAGE_KEY = 'otak-committer.alwaysStageAll';

const vscodeStagingPrompts: StagingPrompts = {
    async confirmStageTracked() {
        const stageLabel = t('git.stageAll');
        const alwaysLabel = t('git.alwaysStageAll');
        const action = await vscode.window.showInformationMessage(
            t('git.stageAllPrompt'),
            stageLabel,
            alwaysLabel,
            t('apiKey.cancel'),
        );
        if (action === alwaysLabel) {
            return 'always';
        }
        return action === stageLabel ? 'stage' : undefined;
    },

    async chooseUntrackedHandling(untracked, hasTrackedChanges) {
        const includeLabel = t('git.includeUntracked');
        const trackedOnlyLabel = t('git.trackedOnly');
        const buttons = hasTrackedChanges
            ? [includeLabel, trackedOnlyLabel, t('apiKey.cancel')]
            : [includeLabel, t('apiKey.cancel')];
        const action = await vscode.window.showInformationMessage(
            t('git.untrackedStagePrompt', {
                count: untracked.length,
                files: summarizePaths(untracked),
            }),
            ...buttons,
        );
        if (action === includeLabel) {
            return 'all';
        }
        return hasTrackedChanges && action === trackedOnlyLabel ? 'tracked' : undefined;
    },
};

/**
 * Ask the user what to stage when nothing is staged yet
 *
 * "Always stage" (persisted in global state) covers tracked changes only;
 * untracked files are confirmed every time.
 *
 * @param globalState - VS Code global state holding the always-stage preference
 * @param changes - Unstaged changes in the working tree
 * @param logger - Logger used to record the user's choice
 * @returns The staging mode, or undefined when the user cancelled
 */
export function promptForStaging(
    globalState: vscode.Memento | undefined,
    changes: WorkingTreeChanges,
    logger: Logger,
): Promise<StagingMode | undefined> {
    return chooseStagingMode(
        changes,
        globalState?.get<boolean>(ALWAYS_STAGE_KEY, false) ?? false,
        vscodeStagingPrompts,
        async () => {
            await globalState?.update(ALWAYS_STAGE_KEY, true);
        },
        logger,
    );
}
