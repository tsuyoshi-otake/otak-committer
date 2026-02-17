import { Logger } from '../infrastructure/logging/Logger';

/**
 * API key validation utilities
 *
 * Provides static methods for validating API key format and sanitizing error messages.
 */
export class ApiKeyValidator {
    /**
     * Regular expression for validating OpenAI API key format
     * Format: sk- followed by at least one character
     */
    private static readonly API_KEY_PATTERN = /^sk-.+$/;

    /** Timeout for API validation requests (30 seconds) */
    private static readonly VALIDATION_TIMEOUT_MS = 30000;

    /**
     * Validates API key format
     *
     * @param key - The API key string to validate
     * @returns True if the key format is valid, false otherwise
     */
    static validateKeyFormat(key: string): boolean {
        if (!key || typeof key !== 'string') {
            return false;
        }

        const trimmedKey = key.trim();
        if (trimmedKey.length === 0) {
            return false;
        }

        return ApiKeyValidator.API_KEY_PATTERN.test(trimmedKey);
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
    ): Promise<{ isValid: boolean; status?: number; isNetworkError?: boolean; error?: string }> {
        const logger = Logger.getInstance();
        logger.info('Validating API key with OpenAI');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(
                () => controller.abort(),
                ApiKeyValidator.VALIDATION_TIMEOUT_MS,
            );

            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
            }).finally(() => clearTimeout(timeoutId));

            if (response.ok) {
                logger.info('API key validation successful');
                return { isValid: true, status: response.status };
            }

            const errorData = await response.json().catch(() => ({}));
            const errorMessage =
                (errorData as { error?: { message?: string } }).error?.message || 'Unknown error';
            logger.warning(`API key validation failed: ${response.status}`);
            const sanitizedMessage = ApiKeyValidator.sanitizeErrorMessage(errorMessage, apiKey);
            return { isValid: false, status: response.status, error: sanitizedMessage };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Network error';
            logger.error('API key validation error:', error);
            const sanitizedMessage = ApiKeyValidator.sanitizeErrorMessage(errorMessage, apiKey);
            return { isValid: false, status: 0, isNetworkError: true, error: sanitizedMessage };
        }
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
