import * as vscode from 'vscode';
import { ServiceConfig } from '../types';
import { StorageManager } from '../infrastructure/storage';
import { Logger } from '../infrastructure/logging';
import { ErrorHandler } from '../infrastructure/error';
import { t } from '../i18n';
import { isApiKeyValidated, markApiKeyValidated } from './openaiKeyValidationCache';
import {
    promptForInvalidStoredApiKey,
    promptForMissingApiKey,
    promptForValidationFailure,
    showApiKeyErrorDialog,
} from './openaiApiKeyDialogs';
import { validateApiKey, type ValidateApiKeyResult } from './openaiValidation';

const MAX_INITIALIZATION_ATTEMPTS = 3;

export { showApiKeyErrorDialog } from './openaiApiKeyDialogs';

type ValidationDecision = 'valid' | 'retry' | 'reset-key' | 'stop';

/**
 * Initializes an OpenAI-backed service instance with interactive API key handling.
 *
 * Behavior:
 * - If an API key is missing, prompts the user to configure it via `otak-committer.setApiKey`.
 * - Validates the key once per session (cached by SHA-256 hash).
 * - Differentiates auth errors (401) from transient issues (network/rate-limit/server).
 *
 * @param config - Optional service configuration (may include `openaiApiKey`)
 * @param context - VS Code extension context (required when `openaiApiKey` is not provided)
 * @param createService - Factory function that creates the service instance
 * @returns Initialized service or undefined if initialization is cancelled/failed
 */
export async function initializeOpenAIService<T>(
    config: Partial<ServiceConfig> | undefined,
    context: vscode.ExtensionContext | undefined,
    createService: (config: Partial<ServiceConfig>) => Promise<T>,
): Promise<T | undefined> {
    const logger = Logger.getInstance();

    try {
        logger.info('Initializing OpenAI service');

        const providedKey = config?.openaiApiKey;
        let apiKey = providedKey?.trim();
        const storage = context ? new StorageManager(context) : undefined;
        const isExplicitKey = providedKey !== undefined;

        // If the caller explicitly provided an empty key, fail fast without prompting.
        if (providedKey !== undefined && !apiKey) {
            logger.warning('OpenAI API key is empty');
            return undefined;
        }

        if (!isExplicitKey && !storage) {
            throw new Error('Extension context is required when OpenAI API key is not provided');
        }

        for (let attempts = 0; attempts < MAX_INITIALIZATION_ATTEMPTS; attempts++) {
            // Try storage only if an API key wasn't provided explicitly.
            if (!apiKey && storage) {
                apiKey = (await storage.getApiKey('openai'))?.trim();
            }

            // If still no API key, offer to configure via the dedicated command.
            if (!apiKey && storage) {
                apiKey = await promptForConfiguredApiKey(storage, logger);
                if (!apiKey) {
                    return undefined;
                }
            }

            if (!apiKey) {
                // Explicit key path: do not prompt.
                logger.warning('OpenAI API key is not configured');
                return undefined;
            }

            const validationDecision = await ensureApiKeyValidated(
                apiKey,
                isExplicitKey,
                storage,
                logger,
            );
            if (validationDecision === 'stop') {
                return undefined;
            }
            if (validationDecision === 'reset-key') {
                apiKey = undefined;
                continue;
            }
            if (validationDecision === 'retry') {
                continue;
            }

            const service = await createService({ ...config, openaiApiKey: apiKey });
            logger.info('OpenAI service initialized successfully');
            return service;
        }

        logger.warning('OpenAI service initialization aborted (too many attempts)');
        return undefined;
    } catch (error) {
        // Check if it's an API key related error.
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
            errorMessage.includes('API key') ||
            errorMessage.includes('401') ||
            errorMessage.includes('Unauthorized')
        ) {
            await showApiKeyErrorDialog();
            return undefined;
        }

        ErrorHandler.handle(error, {
            operation: t('operations.initializingOpenAIService'),
            component: 'OpenAIServiceFactory',
        });
        return undefined;
    }
}

async function promptForConfiguredApiKey(
    storage: StorageManager,
    logger: Logger,
): Promise<string | undefined> {
    const action = await promptForMissingApiKey();

    if (action === 'settings') {
        await vscode.commands.executeCommand('otak-committer.openSettings');
        return undefined;
    }

    if (action === 'set') {
        await vscode.commands.executeCommand('otak-committer.setApiKey');
        const apiKey = (await storage.getApiKey('openai'))?.trim();
        if (apiKey) {
            return apiKey;
        }
    }

    logger.warning('OpenAI API key is not configured');
    return undefined;
}

async function ensureApiKeyValidated(
    apiKey: string,
    isExplicitKey: boolean,
    storage: StorageManager | undefined,
    logger: Logger,
): Promise<ValidationDecision> {
    if (isApiKeyValidated(apiKey)) {
        return 'valid';
    }

    const validation = await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: t('apiKey.validating'),
            cancellable: false,
        },
        async () => validateApiKey(apiKey),
    );

    if (validation.ok) {
        markApiKeyValidated(apiKey);
        return 'valid';
    }

    if (isExplicitKey || !storage) {
        logger.warning('OpenAI API key validation failed', validation);
        return 'stop';
    }

    return handleStoredKeyValidationFailure(validation, apiKey, storage);
}

async function handleStoredKeyValidationFailure(
    validation: ValidateApiKeyResult & { ok: false },
    apiKey: string,
    storage: StorageManager,
): Promise<ValidationDecision> {
    if (validation.kind === 'auth') {
        return handleInvalidStoredKey(storage);
    }

    const action = await promptForValidationFailure(formatValidationReason(validation));
    if (action === 'diagnose') {
        await vscode.commands.executeCommand('otak-committer.diagnoseStorage');
        return 'retry';
    }
    if (action === 'retry') {
        return 'retry';
    }
    if (action === 'continue') {
        markApiKeyValidated(apiKey);
        return 'valid';
    }
    return 'stop';
}

async function handleInvalidStoredKey(storage: StorageManager): Promise<ValidationDecision> {
    const action = await promptForInvalidStoredApiKey();

    if (action === 'diagnose') {
        await vscode.commands.executeCommand('otak-committer.diagnoseStorage');
        return 'stop';
    }

    if (action === 'remove') {
        await storage.deleteApiKey('openai');
        vscode.window.showInformationMessage(t('apiKey.removed'));
        return 'stop';
    }

    if (action === 'update') {
        await vscode.commands.executeCommand('otak-committer.setApiKey');
        return 'reset-key';
    }

    return 'stop';
}

function formatValidationReason(validation: ValidateApiKeyResult & { ok: false }): string {
    if (validation.retryAfterSeconds === undefined) {
        return validation.reason;
    }
    return `${validation.reason} (retry after ${validation.retryAfterSeconds}s)`;
}
