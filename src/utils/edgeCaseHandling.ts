/**
 * Edge case handling for commit message generation
 *
 * **Feature: commit-message-generation-robustness**
 * **Property 10: Edge case handling**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
 */

export { detectEdgeCase } from './edgeCaseDetection';
export { createEdgeCasePrompt, getEdgeCaseDescription } from './edgeCasePrompts';
export { EdgeCaseType } from './edgeCaseTypes';
export type { EdgeCasePromptOptions, ExtendedDiffMetadata } from './edgeCaseTypes';
