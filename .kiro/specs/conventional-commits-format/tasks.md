# Implementation Plan

- [x] 1. Add configuration for Conventional Commits format
  - Add `useConventionalCommits` boolean configuration to package.json
  - Set default value to `true`
  - _Requirements: 3.1, 3.4_

- [x] 2. Implement file path extraction from Git diff
  - [x] 2.1 Create `extractFilePathsFromDiff()` method in PromptService
    - Use regex to extract file paths from diff headers
    - Handle various diff formats
    - Return array of file paths
    - _Requirements: 2.1_

  - [x] 2.2 Write property test for file path extraction
    - **Property 3: File path extraction completeness**
    - **Validates: Requirements 2.1**

- [x] 3. Implement scope hint generation
  - [x] 3.1 Create `generateScopeHint()` method in PromptService
    - Analyze file paths to determine common scope
    - Filter out generic directories (src, lib, app, dist, build)
    - Return most common meaningful directory as scope hint
    - Return empty string if no meaningful scope found
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Write property test for scope hint generation
    - **Property 2: Scope hint extraction**
    - **Validates: Requirements 2.1, 2.2**

- [x] 4. Implement format instruction generation
  - [x] 4.1 Create `getConventionalCommitsFormat()` method in PromptService
    - Generate format instruction with scope guidance
    - Include scope hint if available
    - Explain when to omit scope
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 4.2 Create `getTraditionalFormat()` method in PromptService
    - Return original `<prefix>: <subject>` format instruction
    - _Requirements: 3.2_

  - [x] 4.3 Write property test for format consistency
    - **Property 1: Format consistency with configuration**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 5. Update createCommitPrompt() method
  - [x] 5.1 Modify `createCommitPrompt()` in PromptService
    - Read `useConventionalCommits` configuration
    - Extract file paths from diff
    - Generate scope hint from file paths
    - Select appropriate format instruction based on configuration
    - Integrate format instruction into prompt
    - Maintain template override behavior
    - _Requirements: 1.1, 1.4, 1.5, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Write property test for backward compatibility
    - **Property 4: Backward compatibility preservation**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x] 5.3 Write property test for scope omission handling
    - **Property 5: Scope omission handling**
    - **Validates: Requirements 1.3**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
