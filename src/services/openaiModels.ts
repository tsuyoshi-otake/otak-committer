/**
 * OpenAI-backed operations with independently controlled model selection.
 */
export type OpenAIOperation = 'commit-message' | 'commit-summary' | 'pr-content' | 'generic-chat';

/**
 * Model identifiers intentionally used by the extension.
 */
export type OpenAIModelId = 'gpt-6-luna';

const MODEL_BY_OPERATION: Record<OpenAIOperation, OpenAIModelId> = {
    'commit-message': 'gpt-6-luna',
    'commit-summary': 'gpt-6-luna',
    'pr-content': 'gpt-6-luna',
    'generic-chat': 'gpt-6-luna',
};

/**
 * Resolve the fixed model for an OpenAI operation.
 */
export function getModelForOperation(operation: OpenAIOperation): OpenAIModelId {
    return MODEL_BY_OPERATION[operation];
}
