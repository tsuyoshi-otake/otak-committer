# Implementation Plan

- [x] 1. Setup test environment and update dependencies
- [x] 1.1 Setup dotenvx for encrypted secret management
  - Install `@dotenvx/dotenvx` as dev dependency
  - Add `.env.local` to `.gitignore` if not already present
  - Update `.env.local.example` with dotenvx setup instructions
  - Add npm script for running tests with dotenvx: `"test:integration": "dotenvx run -- npm test"`
  - Document dotenvx setup process in README
  - _Requirements: Testing setup_

- [x] 1.2 Create test mock utilities for Responses API
  - Create `src/test/mocks/responsesAPI.mock.ts`
  - Implement `mockSuccess()` for successful API responses
  - Implement `mockError()` for error responses
  - Implement `verifyCall()` for request verification
  - _Requirements: Testing setup_

- [x] 1.3 Update dependencies and add Responses API support
  - Update OpenAI SDK to latest version that supports custom endpoints
  - Add HTTP client utilities for direct Responses API calls if needed
  - Update TypeScript types for Responses API request/response formats
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement token management utilities
- [x] 2.1 Create TokenManager class with estimation and truncation methods
  - Implement `estimateTokens(text: string): number` using 4 chars/token ratio
  - Implement `truncateInput(input: string, maxTokens: number): string`
  - Implement `validateAllocation(inputTokens: number, outputTokens: number): boolean`
  - _Requirements: 2.5, 6.5_

- [x] 2.2 Write property test for token estimation (no API key required)
  - **Property 4: Token estimation consistency**
  - **Validates: Requirements 2.5**
  - Use fast-check to generate random text strings
  - Verify token count = Math.ceil(length / 4)

- [x] 2.3 Write property test for token budget invariant (no API key required)
  - **Property 13: Token budget invariant**
  - **Validates: Requirements 6.5**
  - Use fast-check to generate random input sizes and request types
  - Verify input + output + buffer <= 400K

- [x] 3. Update OpenAI service for Responses API
- [x] 3.1 Add Responses API client method
  - Implement `generateWithResponsesAPI()` method
  - Use `/v1/responses` endpoint with GPT-5.1 model
  - Include reasoning effort parameter
  - Handle response parsing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_

- [x] 3.2 Write property test for API endpoint consistency (no API key required)
  - **Property 1: API endpoint and model consistency**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  - Mock Responses API calls
  - Use fast-check to generate random request types
  - Verify all use `/v1/responses` endpoint and `gpt-5.1` model

- [x] 3.3 Write property test for reasoning effort configuration (no API key required)
  - **Property 5: Reasoning effort configuration**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
  - Mock Responses API calls
  - Use fast-check to generate random request types
  - Verify all include `reasoning.effort: "low"`

- [x] 3.4 Update generateCommitMessage to use Responses API
  - Replace Chat Completions API call with Responses API
  - Update prompt format from messages array to single input string
  - Set max_output_tokens to 2000
  - Apply token truncation if input exceeds 200K
  - _Requirements: 1.1, 2.1, 2.4, 6.1_

- [x] 3.5 Write property test for commit message output allocation (no API key required)
  - **Property 9: Commit message output allocation**
  - **Validates: Requirements 6.1**
  - Mock Responses API calls
  - Use fast-check to generate random commit message requests
  - Verify max_output_tokens = 2000

- [x] 3.6 Update generatePRContent to use Responses API
  - Replace Chat Completions API calls with Responses API
  - Update prompt format for title and body generation
  - Set max_output_tokens to 200 for title, 4000 for body
  - Apply token truncation if input exceeds 200K
  - _Requirements: 1.2, 2.2, 2.4, 6.2, 6.3_

- [x] 3.7 Write property test for PR output allocation (no API key required)
  - **Property 10: PR title output allocation**
  - **Property 11: PR body output allocation**
  - **Validates: Requirements 6.2, 6.3**
  - Mock Responses API calls
  - Use fast-check to generate random PR requests
  - Verify max_output_tokens = 200 for title, 4000 for body

- [x] 4. Update Issue Generator service for Responses API
- [x] 4.1 Update IssueGeneratorService to use Responses API
  - Replace Chat Completions API call with Responses API
  - Update prompt format from messages array to single input string
  - Set max_output_tokens to 8000
  - Update token limit from 100K to 200K
  - Apply token truncation if input exceeds 200K
  - _Requirements: 1.3, 2.3, 2.4, 6.4_

- [x] 4.2 Write property test for issue output allocation (no API key required)
  - **Property 12: Issue output allocation**
  - **Validates: Requirements 6.4**
  - Mock Responses API calls
  - Use fast-check to generate random issue requests
  - Verify max_output_tokens = 8000

- [x] 5. Update token limits across all services
- [x] 5.1 Update Git service token limits
  - Change TRUNCATE_THRESHOLD_TOKENS from 200K to 200K (already correct)
  - Update warning messages to reflect unified 200K limit
  - _Requirements: 2.1, 2.4_

- [x] 5.2 Write property test for 200K token support (no API key required)
  - **Property 2: 200K token input support**
  - **Validates: Requirements 2.1, 2.2, 2.3**
  - Mock Responses API calls
  - Use fast-check to generate random inputs up to 200K tokens
  - Verify all are accepted without truncation

- [x] 5.3 Write property test for input truncation (no API key required)
  - **Property 3: Input truncation with warning**
  - **Validates: Requirements 2.4**
  - Mock Responses API calls and warning display
  - Use fast-check to generate random inputs exceeding 200K tokens
  - Verify truncation occurs and warning is displayed

- [x] 5.4 Update GitHub service token limits
  - Change MAX_TOKENS from 100K to 200K
  - Update truncation logic to use new limit
  - Update warning messages
  - _Requirements: 2.2, 2.4_

- [x] 5.5 Update IssueGenerator service token limits
  - Change MAX_TOKENS from 100K to 200K
  - Update token counting logic
  - Update warning messages
  - _Requirements: 2.3, 2.4_

- [x] 6. Implement enhanced error handling
- [x] 6.1 Create ResponsesAPIError types and classification
  - Define ResponsesAPIErrorType enum
  - Create error classification function
  - Map HTTP status codes to error types
  - _Requirements: 4.1, 4.2_

- [x] 6.2 Write property test for error logging (no API key required)
  - **Property 6: Error logging completeness**
  - **Validates: Requirements 4.1**
  - Mock Responses API errors
  - Use fast-check to generate random API errors
  - Verify all are logged with full context (request params, error type, stack trace)

- [x] 6.3 Write property test for user-friendly error messages (no API key required)
  - **Property 7: User-friendly error messages**
  - **Validates: Requirements 4.2**
  - Mock Responses API errors
  - Use fast-check to generate random API errors
  - Verify user-friendly messages are displayed without technical details

- [x] 6.4 Implement error recovery handlers
  - Implement handleRateLimit with retry-after display
  - Implement handleInvalidModel with permission check suggestion
  - Implement handleContextExceeded with truncation notice
  - Implement handleNetworkError with retry guidance
  - Implement handleAuthError with API key update prompt
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 6.5 Update error handling in OpenAI service
  - Wrap Responses API calls with try-catch
  - Classify errors using ResponsesAPIErrorType
  - Log errors with full context
  - Display user-friendly messages
  - _Requirements: 4.1, 4.2_

- [x] 7. Add configuration support for reasoning effort
- [x] 7.1 Add VS Code settings for reasoning effort
  - Add `otakCommitter.reasoningEffort` setting with enum values
  - Add `otakCommitter.maxInputTokens` setting with default 200000
  - Update package.json configuration schema
  - _Requirements: 3.5_

- [x] 7.2 Update OpenAI service to read reasoning effort setting
  - Read reasoning effort from VS Code configuration
  - Apply setting to all Responses API calls
  - Default to "low" if not configured
  - _Requirements: 3.5_

- [x] 8. Ensure backward compatibility with existing configurations
- [x] 8.1 Verify existing settings are preserved
  - Test temperature setting is applied to Responses API
  - Test language preference is applied to prompts
  - Test emoji preference is applied to content generation
  - Test custom message setting is included in prompts
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8.2 Write property test for configuration preservation (no API key required)
  - **Property 8: Configuration preservation**
  - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
  - Mock Responses API calls
  - Use fast-check to generate random configuration combinations
  - Verify all settings (temperature, language, emoji, custom messages) are applied to API requests

- [x] 8.3 Write integration test for API key validation (requires dotenvx API key)
  - Verify existing API keys are read from secure storage
  - Verify API keys work with GPT-5.1 via real API call
  - Test validation process for GPT-5.1 access
  - Run with: `npx dotenvx run -- npm test`
  - _Requirements: 1.5, 5.1_

- [x] 9. Update prompt service for Responses API format
- [x] 9.1 Update createCommitPrompt to return single string
  - Remove system message wrapping
  - Incorporate system instructions into prompt text
  - Maintain all existing prompt features (prefixes, templates, etc.)
  - _Requirements: 1.1_

- [x] 9.2 Update createPRPrompt to return single strings
  - Update title prompt to single string format
  - Update body prompt to single string format
  - Incorporate system instructions into prompt text
  - _Requirements: 1.2_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update documentation and changelog
- [x] 11.1 Update README with GPT-5.1 information
  - Document GPT-5.1 migration
  - Document new 200K token limit
  - Document reasoning effort configuration
  - Add migration notes for users

- [x] 11.2 Update CHANGELOG with migration details
  - Add entry for GPT-5.1 migration
  - Document breaking changes (if any)
  - Document new features (reasoning effort config)
  - Document improvements (unified 200K limit)

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
