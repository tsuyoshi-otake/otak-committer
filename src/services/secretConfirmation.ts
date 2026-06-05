import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import type { SecretDetectionResult } from '../utils/secretDetection';

/**
 * Ask the user to confirm sending content that may contain detected secrets to the AI model
 *
 * @param detection - Result of the secret detection scan on the outbound content
 * @param logger - Logger used to record the warning and outcome
 * @param logMessage - Message logged when potential secrets are detected
 * @param messageKey - i18n key used for the modal warning text
 * @returns true if it is safe to proceed (no secrets or user accepted), false otherwise
 */
export async function confirmProceedWithPotentialSecrets(
    detection: SecretDetectionResult,
    logger: Logger,
    logMessage: string,
    messageKey = 'messages.secretDetectionWarning',
): Promise<boolean> {
    if (!detection.hasPotentialSecrets) {
        return true;
    }

    const patterns = detection.matchedPatternIds.join(', ');
    logger.warning(logMessage, {
        matchedPatternIds: detection.matchedPatternIds,
    });

    const yesLabel = t('buttons.yes');
    const noLabel = t('buttons.no');
    const action = await vscode.window.showWarningMessage(
        t(messageKey, {
            count: detection.matchedPatternIds.length,
            patterns,
        }),
        { modal: true },
        yesLabel,
        noLabel,
    );

    if (action === yesLabel) {
        return true;
    }

    logger.info('AI generation cancelled because potential secrets were detected');
    return false;
}
