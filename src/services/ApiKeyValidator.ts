import { Logger } from '../infrastructure/logging/Logger';
import {
    DEFAULT_OPENAI_BASE_URL,
    isOfficialOpenAIBaseUrl,
    resolveOpenAIBaseUrl,
} from './openaiConnection';
import { validateApiKey } from './openaiValidation';

/**
 * API key validation utilities
 *
 * Provides static methods for validating API key format and sanitizing error messages.
 */
export class ApiKeyValidator {
    /**
     * Regular expression for validating OpenAI API key format
     * Accepts known OpenAI key prefixes: sk-proj-, sk-svcacct-, sk-admin-, sk-or-,
     * sk-ant-, or legacy keys starting with sk-, followed by 20+ characters from
     * the alphanumeric, underscore, and hyphen set.
     */
    private static readonly API_KEY_PATTERN = /^sk-(?:proj-|svcacct-|admin-|or-|ant-)?[A-Za-z0-9_-]{20,}$/;

    /**
     * Validates API key format
     *
     * @param key - The API key string to validate
     * @returns True if the key format is valid, false otherwise
     */
    static validateKeyFormat(key: string, baseURL = DEFAULT_OPENAI_BASE_URL): boolean {
        if (!key || typeof key !== 'string') {
            return false;
        }

        const trimmedKey = key.trim();
        if (trimmedKey.length === 0) {
            return false;
        }

        const normalizedBaseURL = resolveOpenAIBaseUrl(baseURL);
        return isOfficialOpenAIBaseUrl(normalizedBaseURL)
            ? ApiKeyValidator.API_KEY_PATTERN.test(trimmedKey)
            : true;
    }

    /**
     * Validates API key with OpenAI API
     *
     * Makes a lightweight API call to verify the key is valid.
     *
     * @param apiKey - The API key to validate
     * @returns Validation result
     */
    static async validateWithOpenAI(
        apiKey: string,
        baseURL = DEFAULT_OPENAI_BASE_URL,
    ): Promise<{
        isValid: boolean;
        isUnsupported?: boolean;
        status?: number;
        isNetworkError?: boolean;
        error?: string;
    }> {
        const logger = Logger.getInstance();
        logger.info('Validating API key with OpenAI');

        const result = await validateApiKey(apiKey, baseURL);
        if (result.ok) {
            logger.info('API key validation successful');
            return { isValid: true, status: 200 };
        }

        logger.warning(`API key validation failed: ${result.status ?? 0}`);
        return {
            isValid: false,
            isUnsupported: result.kind === 'unsupported',
            status: result.status,
            isNetworkError: result.kind === 'network',
            error: result.reason,
        };
    }

    /**
     * Sanitizes error messages to remove API key values
     *
     * @param message - The original error message
     * @param apiKey - The API key to remove from the message
     * @returns Sanitized error message
     */
    static sanitizeErrorMessage(message: string, apiKey: string): string {
        if (!message || !apiKey) {
            return message || '';
        }
        return message.split(apiKey).join('[REDACTED]');
    }
}
