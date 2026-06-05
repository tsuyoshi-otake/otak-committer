import * as vscode from 'vscode';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index.js';
import type { SecretDetectionResult } from '../utils/secretDetection';

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
