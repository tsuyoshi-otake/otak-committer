/**
 * Service provider identifiers used for API key storage and retrieval
 */
export type ServiceProvider = 'openai' | 'github';

export const ServiceProvider = {
    OpenAI: 'openai' as const,
    GitHub: 'github' as const,
} as const;
