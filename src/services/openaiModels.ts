/**
 * OpenAI-backed operations with independently controlled model selection.
 */
export type OpenAIOperation = 'commit-message' | 'commit-summary' | 'pr-content' | 'generic-chat';

/**
 * Model identifiers intentionally used by the extension.
 */
export type OpenAIModelId = 'gpt-5.6-luna' | 'gpt-5.4';

const MODEL_BY_OPERATION: Record<OpenAIOperation, OpenAIModelId> = {
    'commit-message': 'gpt-5.6-luna',
    'commit-summary': 'gpt-5.6-luna',
    'pr-content': 'gpt-5.4',
    'generic-chat': 'gpt-5.4',
};

/**
 * Resolve the fixed model for an OpenAI operation.
 */
export function getModelForOperation(operation: OpenAIOperation): OpenAIModelId {
    return MODEL_BY_OPERATION[operation];
}
