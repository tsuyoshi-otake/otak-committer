/**
 * Staging rules and index operations used before a commit diff is generated.
 *
 * UI-free: prompts are injected (see git.stagingPrompts.ts for the VS Code
 * implementation), so the rules below are testable without VS Code.
 *
 * Invariants:
 * - Untracked files are never staged without asking, even when the user chose
 *   to always stage; "always" covers tracked changes only.
 * - The extension only stages when nothing was staged before, so every staged
 *   path afterwards is one the extension staged and may later unstage.
 */

import type { SimpleGit } from 'simple-git';
import type { Logger } from '../infrastructure/logging/Logger';

/**
 * How far the extension stages: tracked changes only, or untracked files too
 */
export type StagingMode = 'tracked' | 'all';

/**
 * A `git status` entry as reported by simple-git
 */
export interface StatusEntry {
    path: string;
    index: string;
    working_dir: string;
    /** Original path of a renamed entry */
    from?: string;
}

/**
 * Unstaged working-tree changes, split by whether git already tracks the path
 */
export interface WorkingTreeChanges {
    tracked: string[];
    untracked: string[];
}

/**
 * Answers to the injected staging prompts; undefined means cancel
 */
export interface StagingPrompts {
    /** Ask before staging tracked changes; 'always' remembers the choice */
    confirmStageTracked(): Promise<'stage' | 'always' | undefined>;
    /**
     * Ask, every time untracked files exist, whether to include them.
     * 'tracked' must only be offered when tracked changes exist.
     */
    chooseUntrackedHandling(
        untracked: string[],
        hasTrackedChanges: boolean,
    ): Promise<StagingMode | undefined>;
}

/**
 * Split changed status entries into tracked and untracked paths
 *
 * @param files - Entries from `git status`
 * @returns Changed tracked paths and untracked paths; ignored entries are dropped
 */
export function classifyWorkingTreeChanges(files: readonly StatusEntry[]): WorkingTreeChanges {
    const tracked: string[] = [];
    const untracked: string[] = [];
    for (const file of files) {
        if (file.index === '?') {
            untracked.push(file.path);
        } else if (file.index !== '!' && (file.index !== ' ' || file.working_dir !== ' ')) {
            tracked.push(file.path);
        }
    }
    return { tracked, untracked };
}

/**
 * Decide what to stage when nothing is staged yet
 *
 * @param changes - Unstaged changes in the working tree
 * @param alwaysStageTracked - Whether the user chose to always stage tracked changes
 * @param prompts - Injected prompts
 * @param rememberAlways - Persists the "always stage" choice
 * @param logger - Logger used to record the decision
 * @returns The staging mode, or undefined when the user cancelled
 */
export async function chooseStagingMode(
    changes: WorkingTreeChanges,
    alwaysStageTracked: boolean,
    prompts: StagingPrompts,
    rememberAlways: () => Promise<void>,
    logger: Pick<Logger, 'info'>,
): Promise<StagingMode | undefined> {
    if (changes.untracked.length > 0) {
        const mode = await prompts.chooseUntrackedHandling(
            changes.untracked,
            changes.tracked.length > 0,
        );
        if (mode === 'all' || (mode === 'tracked' && changes.tracked.length > 0)) {
            logger.info(`Staging ${mode === 'all' ? 'tracked and untracked' : 'tracked'} changes`);
            return mode;
        }
        logger.info('User cancelled staging changes with untracked files present');
        return undefined;
    }

    if (alwaysStageTracked) {
        return 'tracked';
    }

    const answer = await prompts.confirmStageTracked();
    if (answer === 'always') {
        await rememberAlways();
        logger.info('User chose to always stage tracked changes');
        return 'tracked';
    }
    if (answer === 'stage') {
        return 'tracked';
    }
    logger.info('User cancelled staging changes for diff generation');
    return undefined;
}

/**
 * Shorten a path list for a prompt
 *
 * @param paths - Paths to show
 * @param max - Maximum number of paths listed by name
 * @returns The first `max` paths, plus a count of the rest
 */
export function summarizePaths(paths: readonly string[], max = 5): string {
    const shown = paths.slice(0, max).join(', ');
    return paths.length > max ? `${shown}, …(+${paths.length - max})` : shown;
}

/**
 * Callbacks and settings for {@link stageChanges}
 */
export interface StageChangesOptions {
    mode: StagingMode;
    changes: WorkingTreeChanges;
    reservedNameFiles: string[];
    isWindowsReservedName: (filePath: string) => boolean;
    indexLockRetryDelayMs: number;
    /** Called once when an index.lock error persists, before the error is rethrown */
    onIndexLockFailure: () => void;
    logger: Pick<Logger, 'warning' | 'error'>;
}

async function stageFile(
    git: SimpleGit,
    file: string,
    options: StageChangesOptions,
): Promise<void> {
    try {
        await git.add(file);
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }
        if (error.message.includes('index.lock')) {
            options.logger.error('Git index.lock error detected', error);
            options.onIndexLockFailure();
            throw error;
        }
        if (error.message.includes('did not match any files')) {
            try {
                await git.rm(file);
            } catch {
                // ignore if already deleted
            }
            return;
        }
        throw error;
    }
}

/**
 * Stage changes in the given mode, retrying once on index.lock errors and
 * falling back to per-file staging (skipping Windows reserved names) when the
 * bulk add fails for another reason
 *
 * @param git - The simple-git client bound to the repository
 * @param options - Mode, changes, and failure handling
 */
export async function stageChanges(git: SimpleGit, options: StageChangesOptions): Promise<void> {
    const bulkArgs = options.mode === 'all' ? ['-A'] : ['-u'];
    try {
        await git.add(bulkArgs);
    } catch (error) {
        if (error instanceof Error && error.message.includes('index.lock')) {
            options.logger.warning('Git index.lock detected, retrying after delay...');
            await new Promise((resolve) => setTimeout(resolve, options.indexLockRetryDelayMs));
            try {
                await git.add(bulkArgs);
                return;
            } catch (retryError) {
                options.logger.error('Git index.lock error persists after retry', retryError);
                options.onIndexLockFailure();
                throw retryError;
            }
        }

        const candidates =
            options.mode === 'all'
                ? [...options.changes.tracked, ...options.changes.untracked]
                : options.changes.tracked;
        if (options.reservedNameFiles.length > 0) {
            options.logger.warning(
                `Skipping Windows reserved name files during staging: ${options.reservedNameFiles.join(', ')}`,
            );
        }

        for (const file of candidates.filter((f) => !options.isWindowsReservedName(f))) {
            await stageFile(git, file, options);
        }
    }
}

/**
 * List every path with a staged change, including both sides of a rename
 *
 * @param files - Entries from `git status`
 * @returns Paths whose index entry differs from HEAD
 */
export function listStagedPaths(files: readonly StatusEntry[]): string[] {
    const paths = new Set<string>();
    for (const file of files) {
        if (file.index === ' ' || file.index === '?' || file.index === '!') {
            continue;
        }
        if (file.from) {
            paths.add(file.from);
        }
        paths.add(file.path);
    }
    return [...paths];
}

/**
 * Run the step that consumes the extension's staging; unless the step reports
 * that a commit message was applied (returns false or throws), unstage what
 * the extension staged for it
 *
 * Unstaging failures are logged and never replace the step's own outcome.
 *
 * @param stagedByExtension - Paths the extension staged for this run
 * @param unstage - Unstages the given paths
 * @param logger - Logger used to record unstaging failures
 * @param step - Returns true once the commit message is applied
 * @returns The step's result
 */
export async function undoStagingUnlessApplied(
    stagedByExtension: readonly string[],
    unstage: (paths: readonly string[]) => Promise<void>,
    logger: Pick<Logger, 'error'>,
    step: () => Promise<boolean>,
): Promise<boolean> {
    let applied = false;
    try {
        applied = await step();
        return applied;
    } finally {
        if (!applied && stagedByExtension.length > 0) {
            try {
                await unstage(stagedByExtension);
            } catch (error) {
                logger.error(
                    'Failed to unstage changes staged for an abandoned commit message',
                    error,
                );
            }
        }
    }
}

/** Keeps each `git reset` command line well under the Windows limit */
const UNSTAGE_ARGS_CHAR_BUDGET = 8000;

/**
 * Restore the index entries of the given paths to HEAD, leaving the working
 * tree untouched; works on an unborn branch too
 *
 * @param git - The simple-git client bound to the repository
 * @param paths - Paths to unstage, as listed by {@link listStagedPaths}
 */
export async function unstagePaths(
    git: Pick<SimpleGit, 'raw'>,
    paths: readonly string[],
): Promise<void> {
    let batch: string[] = [];
    let batchChars = 0;
    const flush = async () => {
        if (batch.length > 0) {
            // Literal pathspecs: a file named like a glob must not match other files
            await git.raw(['--literal-pathspecs', 'reset', '-q', '--', ...batch]);
            batch = [];
            batchChars = 0;
        }
    };

    for (const filePath of paths) {
        if (batch.length > 0 && batchChars + filePath.length + 1 > UNSTAGE_ARGS_CHAR_BUDGET) {
            await flush();
        }
        batch.push(filePath);
        batchChars += filePath.length + 1;
    }
    await flush();
}
