import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n';
import { getRepositoryForCurrentWorkspace } from '../services/git.repository';

/**
 * Set the generated commit message in the source control input box.
 *
 * @param message - The commit message to set
 * @param logger - Logger for command diagnostics
 */
export async function setCommitMessageInSourceControl(
    message: string,
    logger: Logger,
): Promise<void> {
    logger.debug('Setting generated message to source control input');

    // Get Git extension
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
        logger.error('Git extension not found');
        throw new Error(t('errors.gitExtensionNotFound'));
    }

    // Get Git API
    const gitApi = gitExtension.exports.getAPI(1);
    const repository = getRepositoryForCurrentWorkspace(gitApi);

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
