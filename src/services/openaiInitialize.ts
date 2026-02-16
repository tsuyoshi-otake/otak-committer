import * as vscode from 'vscode';
import OpenAI from 'openai';
import { ServiceConfig } from '../types';
import { StorageManager } from '../infrastructure/storage';
import { Logger } from '../infrastructure/logging';
import { ErrorHandler } from '../infrastructure/error';
import { t } from '../i18n';
import { isApiKeyValidated, markApiKeyValidated } from './openaiKeyValidationCache';

type ValidationKind = 'auth' | 'rate_limit' | 'network' | 'server' | 'unknown';
type ValidateApiKeyResult =
    | { ok: true }
    | { ok: false; kind: ValidationKind; status?: number; reason: string; retryAfterSeconds?: number };

function redactApiKey(message: string, apiKey: string): string {
    if (!message || !apiKey) {
        return message || '';
    }
    return message.split(apiKey).join('[REDACTED]');
}

function getErrorStatus(error: unknown): number | undefined {
    const status = (error as { status?: unknown } | null | undefined)?.status;
    if (typeof status === 'number') {
        return status;
    }

    const responseStatus = (error as { response?: { status?: unknown } } | null | undefined)?.response?.status;
    if (typeof responseStatus === 'number') {
        return responseStatus;
    }

    return undefined;
}

function getErrorMessage(error: unknown): string {
    const fromBody = (error as { error?: { message?: unknown } } | null | undefined)?.error?.message;
    if (typeof fromBody === 'string' && fromBody.trim()) {
        return fromBody;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function getRetryAfterSeconds(error: unknown): number | undefined {
    const headers =
        (error as { headers?: Record<string, unknown> } | null | undefined)?.headers ??
        (error as { response?: { headers?: Record<string, unknown> } } | null | undefined)?.response?.headers;

    if (!headers) {
        return undefined;
    }

    const raw =
        (headers['retry-after'] as unknown) ??
        (headers['Retry-After'] as unknown) ??
        (headers['x-ratelimit-reset'] as unknown) ??
        (headers['X-RateLimit-Reset'] as unknown);

    if (typeof raw === 'number') {
        return raw;
    }

    if (typeof raw === 'string') {
        const parsed = Number.parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
    }

    return undefined;
}

async function validateApiKey(apiKey: string): Promise<ValidateApiKeyResult> {
    try {
        const client = new OpenAI({ apiKey });
        await client.models.list();
        return { ok: true };
    } catch (error) {
        const status = getErrorStatus(error);
        const reason = redactApiKey(getErrorMessage(error) || 'Unknown error', apiKey);
        const retryAfterSeconds = getRetryAfterSeconds(error);

        if (status === 401) {
            return { ok: false, kind: 'auth', status, reason };
        }
        if (status === 429) {
            return { ok: false, kind: 'rate_limit', status, reason, retryAfterSeconds };
        }
        if (typeof status === 'number' && status >= 500) {
            return { ok: false, kind: 'server', status, reason, retryAfterSeconds };
        }
        if (status === undefined || status === 0) {
            return { ok: false, kind: 'network', status, reason };
        }

        return { ok: false, kind: 'unknown', status, reason, retryAfterSeconds };
    }
}

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
    createService: (config: Partial<ServiceConfig>) => Promise<T>
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

        for (let attempts = 0; attempts < 3; attempts++) {
            // Try storage only if an API key wasn't provided explicitly.
            if (!apiKey && storage) {
                apiKey = (await storage.getApiKey('openai'))?.trim();
            }

            // If still no API key, offer to configure via the dedicated command.
            if (!apiKey && storage) {
                const setApiKeyLabel = t('apiKey.setApiKey');
                const openSettingsLabel = t('commands.openSettings');
                const action = await vscode.window.showWarningMessage(
                    t('messages.apiKeyNotConfigured'),
                    setApiKeyLabel,
                    openSettingsLabel,
                    t('apiKey.cancel')
                );

                if (action === openSettingsLabel) {
                    await vscode.commands.executeCommand('otak-committer.openSettings');
                    return undefined;
                }

                if (action === setApiKeyLabel) {
                    await vscode.commands.executeCommand('otak-committer.setApiKey');
                    apiKey = (await storage.getApiKey('openai'))?.trim();
                }

                if (!apiKey) {
                    logger.warning('OpenAI API key is not configured');
                    return undefined;
                }
            }

            if (!apiKey) {
                // Explicit key path: do not prompt.
                logger.warning('OpenAI API key is not configured');
                return undefined;
            }

            if (!isApiKeyValidated(apiKey)) {
                const validation = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: t('apiKey.validating'),
                        cancellable: false
                    },
                    async () => validateApiKey(apiKey!)
                );

                if (!validation.ok) {
                    // Explicit key path: do not prompt or mutate storage.
                    if (isExplicitKey || !storage) {
                        logger.warning('OpenAI API key validation failed', validation);
                        return undefined;
                    }

                    if (validation.kind === 'auth') {
                        const updateLabel = t('apiKey.updateKey');
                        const removeLabel = t('apiKey.removeKey');
                        const diagnoseLabel = t('commands.diagnoseStorage');
                        const action = await vscode.window.showErrorMessage(
                            t('apiKey.invalidKeyPrompt'),
                            updateLabel,
                            removeLabel,
                            diagnoseLabel,
                            t('apiKey.cancel')
                        );

                        if (action === diagnoseLabel) {
                            await vscode.commands.executeCommand('otak-committer.diagnoseStorage');
                            return undefined;
                        }

                        if (action === removeLabel) {
                            await storage.deleteApiKey('openai');
                            vscode.window.showInformationMessage(t('apiKey.removed'));
                            return undefined;
                        }

                        if (action === updateLabel) {
                            await vscode.commands.executeCommand('otak-committer.setApiKey');
                            apiKey = undefined;
                            continue;
                        }

                        return undefined;
                    }

                    const reason = validation.retryAfterSeconds !== undefined
                        ? `${validation.reason} (retry after ${validation.retryAfterSeconds}s)`
                        : validation.reason;

                    const retryLabel = t('apiKey.retryValidation');
                    const continueLabel = t('apiKey.continueWithoutValidation');
                    const diagnoseLabel = t('commands.diagnoseStorage');
                    const action = await vscode.window.showWarningMessage(
                        t('apiKey.validationFailed', { reason }),
                        retryLabel,
                        continueLabel,
                        diagnoseLabel,
                        t('apiKey.cancel')
                    );

                    if (action === diagnoseLabel) {
                        await vscode.commands.executeCommand('otak-committer.diagnoseStorage');
                        continue;
                    }

                    if (action === retryLabel) {
                        continue;
                    }

                    if (action === continueLabel) {
                        markApiKeyValidated(apiKey);
                    } else {
                        return undefined;
                    }
                } else {
                    markApiKeyValidated(apiKey);
                }
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
        if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            const setApiKeyLabel = t('apiKey.setApiKey');
            const diagnoseStorageLabel = t('commands.diagnoseStorage');
            const openSettingsLabel = t('commands.openSettings');
            const action = await vscode.window.showErrorMessage(
                t('apiKey.errorPrompt'),
                setApiKeyLabel,
                diagnoseStorageLabel,
                openSettingsLabel,
                t('apiKey.cancel')
            );

            if (action === setApiKeyLabel) {
                await vscode.commands.executeCommand('otak-committer.setApiKey');
                return undefined;
            }

            if (action === diagnoseStorageLabel) {
                await vscode.commands.executeCommand('otak-committer.diagnoseStorage');
                return undefined;
            }

            if (action === openSettingsLabel) {
                await vscode.commands.executeCommand('otak-committer.openSettings');
            }
            return undefined;
        }

        ErrorHandler.handle(error, {
            operation: 'Initialize OpenAI service',
            component: 'OpenAIServiceFactory'
        });
        return undefined;
    }
}
