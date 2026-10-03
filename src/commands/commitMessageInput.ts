import type { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n';
import type { RepositoryTarget } from '../services/git.repository';

/**
 * Set the generated commit message in the source control input box.
 *
 * The target is the repository resolved when the command started, so the
 * message lands in the repository whose diff it describes.
 *
 * @param message - The commit message to set
 * @param target - Repository resolved at the start of the command
 * @param logger - Logger for command diagnostics
 */
export function setCommitMessageInSourceControl(
    message: string,
    target: Pick<RepositoryTarget, 'repository' | 'gitExtensionAvailable'>,
    logger: Pick<Logger, 'debug' | 'error'>,
): void {
    logger.debug('Setting generated message to source control input');

    if (!target.gitExtensionAvailable) {
        logger.error('Git extension not found');
        throw new Error(t('errors.gitExtensionNotFound'));
    }

    const { repository } = target;
    if (!repository) {
        logger.error('No Git repository found');
        throw new Error(t('errors.noGitRepository'));
    }
    if (!repository.inputBox) {
        logger.error('Git repository input box is not available');
        throw new Error(t('errors.gitInputBoxUnavailable'));
    }

    // Set the message in the input box
    repository.inputBox.value = message;
    logger.debug('Successfully set commit message');
}
