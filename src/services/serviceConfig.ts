import { ConfigManager } from '../infrastructure/config/ConfigManager';
import type { ServiceConfig } from '../types';
import { DEFAULT_REASONING_EFFORT } from '../types/enums/ReasoningEffort';

/**
 * Build the complete service configuration from the single VS Code settings adapter.
 *
 * `openaiBaseUrl` is the raw setting. It is resolved against OPENAI_BASE_URL and
 * validated only where an OpenAI connection is created, so an invalid endpoint
 * cannot break services that never talk to OpenAI.
 *
 * Credentials are never read from settings: API keys and tokens live in
 * SecretStorage (legacy plaintext settings are migrated by StorageMigrationService)
 * and are passed explicitly by the initializers that resolve them.
 */
export function getServiceConfig(): ServiceConfig {
    const config = new ConfigManager();
    return {
        openaiBaseUrl: config.get('openaiBaseUrl'),
        language: config.get('language') || 'english',
        messageStyle: config.get('messageStyle') || 'normal',
        useEmoji: config.get('useEmoji') || false,
        reasoningEffort: config.get('reasoningEffort') || DEFAULT_REASONING_EFFORT,
    };
}
