/**
 * Service provider identifiers used for API key storage and retrieval
 */
export type ServiceProvider = 'openai' | 'github';

/**
 * Namespace-style constants for `ServiceProvider` literals.
 */
export const ServiceProvider = {
    OpenAI: 'openai' as const,
    GitHub: 'github' as const,
} as const;
