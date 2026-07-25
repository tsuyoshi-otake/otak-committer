import * as vscode from 'vscode';
import { StorageManager } from '../infrastructure/storage/StorageManager';
import { Logger } from '../infrastructure/logging/Logger';
import { ApiKeyValidator } from './ApiKeyValidator';
import { ApiKeyAction, handleExistingKey, promptForApiKey } from './apiKey.prompts';
import { promptAndSaveApiKey, validateCurrentApiKey } from './apiKey.flow';
import { t } from '../i18n/index';
import { ConfigManager } from '../infrastructure/config/ConfigManager';
import { resolveOpenAIBaseUrl } from './openaiConnection';

export type { ApiKeyAction };

/**
 * Result of validating an API key against the OpenAI API.
 */
export interface ValidationResult {
    isValid: boolean;
    isUnsupported?: boolean;
    status?: number;
    isNetworkError?: boolean;
    error?: string;
}

/**
 * Coordinates user interaction, validation, and secure storage of the OpenAI API key.
 */
export class ApiKeyManager {
    private static readonly MAX_VALIDATION_RETRIES = 3;
    private readonly logger: Logger;

    constructor(
        _context: vscode.ExtensionContext,
        private readonly storage: StorageManager,
        private readonly config: Pick<ConfigManager, 'get'> = new ConfigManager(),
    ) {
        this.logger = Logger.getInstance();
    }

    static validateKeyFormat(key: string, baseURL?: string): boolean {
        return ApiKeyValidator.validateKeyFormat(key, baseURL);
    }

    private getBaseURL(): string {
        return resolveOpenAIBaseUrl(
            this.config.get('openaiBaseUrl'),
            process.env.OPENAI_BASE_URL,
        );
    }

    async promptForApiKey(): Promise<string | undefined> {
        const baseURL = this.getBaseURL();
        return promptForApiKey(this.logger, (key) =>
            ApiKeyManager.validateKeyFormat(key, baseURL),
        );
    }

    async handleExistingKey(): Promise<ApiKeyAction> {
        return handleExistingKey(this.logger);
    }

    async removeApiKey(): Promise<void> {
        this.logger.info('Removing API key from storage');
        await this.storage.deleteApiKey('openai');
        vscode.window.showInformationMessage(t('apiKey.removed'));
        this.logger.info('API key removed successfully');
    }

    async validateWithOpenAI(apiKey: string): Promise<ValidationResult> {
        return ApiKeyValidator.validateWithOpenAI(apiKey, this.getBaseURL());
    }

    private async validateWithProgress(apiKey: string): Promise<ValidationResult> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: t('apiKey.validating'),
                cancellable: false,
            },
            async () => this.validateWithOpenAI(apiKey),
        );
    }

    private async promptAndSaveApiKey(): Promise<void> {
        await promptAndSaveApiKey({
            logger: this.logger,
            storage: this.storage,
            promptForApiKey: () => this.promptForApiKey(),
            validateKeyFormat: (key) =>
                ApiKeyManager.validateKeyFormat(key, this.getBaseURL()),
            validateWithProgress: (apiKey) => this.validateWithProgress(apiKey),
        });
    }

    private async validateCurrentApiKey(): Promise<void> {
        await validateCurrentApiKey({
            storage: this.storage,
            promptAndSaveApiKey: () => this.promptAndSaveApiKey(),
            validateWithProgress: (apiKey) => this.validateWithProgress(apiKey),
            maxValidationRetries: ApiKeyManager.MAX_VALIDATION_RETRIES,
        });
    }

    sanitizeErrorMessage(message: string, apiKey: string): string {
        return ApiKeyValidator.sanitizeErrorMessage(message, apiKey);
    }

    async configureApiKey(): Promise<void> {
        this.logger.info('Starting API key configuration');

        try {
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
