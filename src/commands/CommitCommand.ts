import { BaseCommand } from './BaseCommand';
import { t } from '../i18n/index.js';
import { isUserAbortError } from '../utils/errorGuards';
import { runCommitGenerationWorkflow } from './commit.workflow';

/**
 * Command for generating commit messages using AI
 *
 * This command analyzes the current Git diff and generates an appropriate
 * commit message using OpenAI's API. It handles the entire workflow from
 * retrieving the diff to setting the message in the source control input box.
 *
 * @example
 * ```typescript
 * const command = new CommitCommand(context);
 * await command.execute();
 * ```
 */
export class CommitCommand extends BaseCommand {
    /**
     * Execute the commit message generation command
     *
     * Workflow:
     * 1. Initialize Git service and retrieve raw diff
     * 2. Check for potential secrets
     * 3. Initialize OpenAI service (needed early for Tier 3 map-reduce)
     * 4. Process diff through hybrid tier system (Tier 1/2/3)
     * 5. Find commit message templates (if any)
     * 6. Generate commit message using AI
     * 7. Sanitize and set the message in source control input
     *
     * @param signal - Optional AbortSignal to cancel the operation
     * @returns A promise that resolves when the command completes
     */
    async execute(signal?: AbortSignal): Promise<void> {
        try {
            this.logger.info('Starting commit message generation');

            if (
                await runCommitGenerationWorkflow({
                    context: this.context,
                    config: this.config,
                    logger: this.logger,
                    signal,
                    initializeOpenAI: () => this.initializeOpenAI(),
                    withProgress: (title, task) => this.withProgress(title, task),
                })
            ) {
                this.logger.info('Successfully generated and set commit message');
            }
        } catch (error) {
            // Silently ignore abort errors (triggered by user pressing the button again)
            if (isUserAbortError(error)) {
                this.logger.info('Commit message generation cancelled by new request');
                return;
            }
            this.handleErrorSilently(error, t('operations.generatingCommitMessage'));
        }
    }
}
