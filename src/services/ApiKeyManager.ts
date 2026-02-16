/**
 * ApiKeyManager - Manages OpenAI API key configuration with security enhancements
 *
 * Provides:
 * - Password-masked input for API key entry
 * - API key format validation
 * - Optional API validation with OpenAI
 * - Update/remove functionality for existing keys
 * - Internationalized user messages
 *
 * @example
 * ```typescript
 * const apiKeyManager = new ApiKeyManager(context, storage);
 * await apiKeyManager.configureApiKey();
 * ```
 */

import * as vscode from 'vscode';
import { StorageManager } from '../infrastructure/storage/StorageManager';
import { Logger } from '../infrastructure/logging/Logger';
import { t } from '../i18n/index';

/**
 * User action types for existing key management
 */
export type ApiKeyAction = 'update' | 'validate' | 'remove' | 'cancel';

/**
 * Validation result interface
 */
export interface ValidationResult {
    isValid: boolean;
    status?: number;
    isNetworkError?: boolean;
    error?: string;
}

/**
 * API Key Manager service class
 *
 * Encapsulates all API key management logic with security best practices:
 * - Password masking for input
 * - Format validation before storage
 * - Secure storage via StorageManager
 * - Optional API validation
 */
export class ApiKeyManager {
    private readonly logger: Logger;

    /**
     * Regular expression for validating OpenAI API key format
     * Format: sk- followed by at least one character
     * This permissive pattern accepts test keys, development keys, and all valid OpenAI API keys
     */
    private static readonly API_KEY_PATTERN = /^sk-.+$/;

    /**
     * Creates a new ApiKeyManager instance
     *
     * @param context - VS Code extension context
     * @param storage - Storage manager for secure key storage
     */
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly storage: StorageManager
    ) {
        this.logger = Logger.getInstance();
        // Context is stored for future extensibility (e.g., accessing globalState)
        void this.context;
    }

    /**
     * Validates API key format
     *
     * Checks if the provided string matches the expected OpenAI API key format:
     * - Starts with 'sk-'
     * - Followed by at least one character
     * - Whitespace is trimmed before validation
     *
     * This permissive validation accepts test keys, development keys, and all valid OpenAI API keys.
     * The actual API key validity is verified by OpenAI's API during optional validation.
     *
     * @param key - The API key string to validate
     * @returns True if the key format is valid, false otherwise
     *
     * @example
     * ```typescript
     * ApiKeyManager.validateKeyFormat('sk-test'); // true
     * ApiKeyManager.validateKeyFormat('sk-a'); // true
     * ApiKeyManager.validateKeyFormat('sk-'); // false (no characters after prefix)
     * ApiKeyManager.validateKeyFormat('invalid'); // false
     * ```
     */
    static validateKeyFormat(key: string): boolean {
        if (!key || typeof key !== 'string') {
            return false;
        }

        const trimmedKey = key.trim();
        if (trimmedKey.length === 0) {
            return false;
        }

        return ApiKeyManager.API_KEY_PATTERN.test(trimmedKey);
    }

    /**
     * Prompts user for API key with password masking
     *
     * Displays a VS Code input box configured with:
     * - Password mode enabled (characters are masked)
     * - Placeholder text showing expected format
     * - Localized prompt text
     *
     * @returns The entered API key or undefined if cancelled
     *
     * @example
     * ```typescript
     * const apiKey = await apiKeyManager.promptForApiKey();
     * if (apiKey) {
     *   // Process the API key
     * }
     * ```
     */
    async promptForApiKey(): Promise<string | undefined> {
        this.logger.info('Prompting user for API key');

        const apiKey = await vscode.window.showInputBox({
            prompt: t('apiKey.enterKey'),
            password: true,
            placeHolder: t('apiKey.placeholder'),
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim() === '') {
                    return null; // Allow empty for cancellation
                }
                if (!ApiKeyManager.validateKeyFormat(value)) {
                    return t('apiKey.invalidFormat');
                }
                return null;
            }
        });

        return apiKey;
    }

    /**
     * Handles existing API key scenario
     *
     * When an API key already exists, presents the user with options to:
     * - Update the existing key
     * - Remove the existing key
     * - Cancel the operation
     *
     * @returns The user's chosen action
     *
     * @example
     * ```typescript
     * const action = await apiKeyManager.handleExistingKey();
     * switch (action) {
     *   case 'update': // Handle update
     *   case 'remove': // Handle remove
     *   case 'cancel': // Handle cancel
     * }
     * ```
     */
    async handleExistingKey(): Promise<ApiKeyAction> {
        this.logger.info('Handling existing API key scenario');

        const items: vscode.QuickPickItem[] = [
            {
                label: t('apiKey.updateKey'),
                description: ''
            },
            {
                label: t('apiKey.validateKey'),
                description: ''
            },
            {
                label: t('apiKey.removeKey'),
                description: ''
            },
            {
                label: t('apiKey.cancel'),
                description: ''
            }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: t('apiKey.keyExists'),
            title: t('apiKey.chooseAction')
        });

        if (!selected) {
            return 'cancel';
        }

        if (selected.label === t('apiKey.updateKey')) {
            return 'update';
        } else if (selected.label === t('apiKey.validateKey')) {
            return 'validate';
        } else if (selected.label === t('apiKey.removeKey')) {
            return 'remove';
        }

        return 'cancel';
    }

    /**
     * Removes API key from all storage locations
     *
     * Deletes the OpenAI API key from:
     * - SecretStorage (primary)
     * - Encrypted GlobalState backup
     * - Legacy Configuration storage
     *
     * @example
     * ```typescript
     * await apiKeyManager.removeApiKey();
     * ```
     */
    async removeApiKey(): Promise<void> {
        this.logger.info('Removing API key from storage');

        await this.storage.deleteApiKey('openai');
        vscode.window.showInformationMessage(t('apiKey.removed'));

        this.logger.info('API key removed successfully');
    }

    /**
     * Validates API key with OpenAI API
     *
     * Makes a lightweight API call to verify the key is valid and has
     * necessary permissions. This is optional and user can skip it.
     *
     * @param apiKey - The API key to validate
     * @returns True if validation succeeds, false otherwise
     *
     * @example
     * ```typescript
     * const isValid = await apiKeyManager.validateWithOpenAI(apiKey);
     * if (!isValid) {
     *   // Handle invalid key
     * }
     * ```
     */
    async validateWithOpenAI(apiKey: string): Promise<ValidationResult> {
        this.logger.info('Validating API key with OpenAI');

        try {
            // Use OpenAI models endpoint for validation (lightweight call)
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.logger.info('API key validation successful');
                return { isValid: true, status: response.status };
            }

            const errorData = await response.json().catch(() => ({}));
            const errorMessage = (errorData as { error?: { message?: string } }).error?.message || 'Unknown error';
            this.logger.warning(`API key validation failed: ${response.status}`);
            // Sanitize error message to never include the API key
            const sanitizedMessage = this.sanitizeErrorMessage(errorMessage, apiKey);
            return { isValid: false, status: response.status, error: sanitizedMessage };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            this.logger.error('API key validation error:', error);
            // Sanitize error message to never include the API key
            const sanitizedMessage = this.sanitizeErrorMessage(errorMessage, apiKey);
            return { isValid: false, status: 0, isNetworkError: true, error: sanitizedMessage };
        }
    }

    private async validateWithProgress(apiKey: string): Promise<ValidationResult> {
        return await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: t('apiKey.validating'),
                cancellable: false
            },
            async () => this.validateWithOpenAI(apiKey)
        );
    }

    private async promptAndSaveApiKey(): Promise<void> {
        while (true) {
            const apiKey = await this.promptForApiKey();

            if (!apiKey) {
                this.logger.info('User cancelled API key input');
                return;
            }

            if (!ApiKeyManager.validateKeyFormat(apiKey)) {
                vscode.window.showErrorMessage(t('apiKey.invalidFormat'));
                continue;
            }

            const validateChoice = await vscode.window.showInformationMessage(
                t('apiKey.validatePrompt'),
                t('buttons.yes'),
                t('buttons.no')
            );

            if (validateChoice === t('buttons.yes')) {
                const result = await this.validateWithProgress(apiKey);

                if (result.isValid) {
                    await this.storage.setApiKey('openai', apiKey);
                    vscode.window.showInformationMessage(t('messages.apiKeySaved'));
                    vscode.window.showInformationMessage(t('apiKey.validationSuccess'));
                    this.logger.info('API key saved and validated successfully');
                    return;
                }

                const reason = result.error || 'Unknown error';
                const retryLabel = t('apiKey.retryValidation');
                const continueLabel = t('apiKey.continueWithoutValidation');
                const cancelLabel = t('apiKey.cancel');

                const action = result.status === 401
                    ? await vscode.window.showWarningMessage(
                        t('apiKey.validationFailed', { reason }),
                        retryLabel,
                        cancelLabel
                    )
                    : await vscode.window.showWarningMessage(
                        t('apiKey.validationFailed', { reason }),
                        retryLabel,
                        continueLabel,
                        cancelLabel
                    );

                if (action === retryLabel) {
                    continue;
                }

                if (action === continueLabel) {
                    await this.storage.setApiKey('openai', apiKey);
                    vscode.window.showInformationMessage(t('messages.apiKeySaved'));
                    this.logger.info('API key saved without validation');
                }

                return;
            }

            await this.storage.setApiKey('openai', apiKey);
            vscode.window.showInformationMessage(t('messages.apiKeySaved'));
            this.logger.info('API key saved successfully');
            return;
        }
    }

    private async validateCurrentApiKey(): Promise<void> {
        const currentKey = (await this.storage.getApiKey('openai'))?.trim();

        if (!currentKey) {
            const setApiKeyLabel = t('apiKey.setApiKey');
            const action = await vscode.window.showWarningMessage(
                t('messages.apiKeyNotConfigured'),
                setApiKeyLabel,
                t('apiKey.cancel')
            );

            if (action === setApiKeyLabel) {
                await this.promptAndSaveApiKey();
            }
            return;
        }

        let attempts = 0;
        const retryLabel = t('apiKey.retryValidation');
        const updateLabel = t('apiKey.updateKey');
        const cancelLabel = t('apiKey.cancel');

        while (attempts < 3) {
            attempts += 1;

            const result = await this.validateWithProgress(currentKey);
            if (result.isValid) {
                vscode.window.showInformationMessage(t('apiKey.validationSuccess'));
                return;
            }

            const reason = result.error || 'Unknown error';
            const action = await vscode.window.showErrorMessage(
                t('apiKey.validationFailed', { reason }),
                retryLabel,
                updateLabel,
                cancelLabel
            );

            if (action === retryLabel) {
                continue;
            }

            if (action === updateLabel) {
                await this.promptAndSaveApiKey();
            }

            return;
        }
    }

    /**
     * Sanitizes error messages to remove API key values
     *
     * Ensures that the actual API key is never exposed in error messages,
     * which could be logged or displayed to users.
     *
     * @param message - The original error message
     * @param apiKey - The API key to remove from the message
     * @returns Sanitized error message
     */
    sanitizeErrorMessage(message: string, apiKey: string): string {
        if (!message || !apiKey) {
            return message || '';
        }
        // Replace the API key with a placeholder if it appears in the message.
        // Use plain string replacement to avoid dynamic RegExp construction.
        return message.split(apiKey).join('[REDACTED]');
    }

    /**
     * Main entry point for API key configuration
     *
     * Orchestrates the complete API key configuration flow:
     * 1. Check if a key already exists
     * 2. If exists, offer update/remove/cancel options
     * 3. Prompt for new key with password masking
     * 4. Validate key format
     * 5. Optionally validate with OpenAI
     * 6. Store the key securely
     *
     * @example
     * ```typescript
     * const apiKeyManager = new ApiKeyManager(context, storage);
     * await apiKeyManager.configureApiKey();
     * ```
     */
    async configureApiKey(): Promise<void> {
        this.logger.info('Starting API key configuration');

        try {
            // Check if API key already exists
            const hasExistingKey = await this.storage.hasApiKey('openai');

            if (hasExistingKey) {
                const action = await this.handleExistingKey();

                switch (action) {
                    case 'remove':
                        await this.removeApiKey();
                        return;
                    case 'validate':
                        await this.validateCurrentApiKey();
                        return;
                    case 'cancel':
                        this.logger.info('User cancelled API key configuration');
                        return;
                    case 'update':
                        // Continue with update flow
                        break;
                }
            }

            await this.promptAndSaveApiKey();
        } catch (error) {
            this.logger.error('Error during API key configuration:', error);
            throw error;
        }
    }
}
