# Implementation Plan

- [x] 1. Add internationalization strings for API key management
  - Add new translation keys to all locale files (en.json, ja.json, ko.json, vi.json, zh-cn.json, zh-tw.json)
  - Include keys for: enterKey, placeholder, invalidFormat, keyExists, chooseAction, updateKey, removeKey, cancel, removed, validatePrompt, validating, validationSuccess, validationFailed, retryPrompt
  - _Requirements: 4.5_

- [x] 2. Create ApiKeyManager service class
- [x] 2.1 Implement core ApiKeyManager class structure
  - Create `src/services/ApiKeyManager.ts` with constructor accepting ExtensionContext and StorageManager
  - Implement `validateKeyFormat()` method with regex validation for `sk-[a-zA-Z0-9]{40,}` pattern
  - Implement `promptForApiKey()` method with password-masked input box
  - _Requirements: 1.1, 1.3, 4.1, 4.2, 4.3_

- [x] 2.2 Write property test for format validation
  - **Property 1: Format validation correctness**
  - **Validates: Requirements 1.3, 1.4, 1.5**

- [x] 2.3 Implement existing key handling logic
  - Implement `handleExistingKey()` method to show quick pick with update/remove/cancel options
  - Implement `removeApiKey()` method to delete key from all storage locations
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2.4 Write property test for complete key removal
  - **Property 2: Complete key removal**
  - **Validates: Requirements 3.4**

- [x] 2.5 Implement API validation logic
  - Implement `validateWithOpenAI()` method using existing OpenAIService
  - Add error handling for network errors, invalid credentials, rate limits, and timeouts
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 2.6 Write property test for API key confidentiality
  - **Property 3: API key confidentiality in error messages**
  - **Validates: Requirements 4.4**

- [x] 2.7 Implement main configuration flow
  - Implement `configureApiKey()` method orchestrating the complete flow
  - Handle new key entry, existing key scenarios, validation prompts, and success/error messages
  - _Requirements: 1.5, 2.1, 2.5, 3.5_

- [x] 2.8 Write unit tests for ApiKeyManager
  - Test input box configuration (password mode, placeholder, prompt)
  - Test format validation edge cases (empty, whitespace, special characters)
  - Test existing key handling flows (update, remove, cancel)
  - Test API validation flows (success, failure, network errors, skip)
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3_

- [x] 3. Update command registration to use ApiKeyManager
  - Modify `src/commands/commandRegistration.ts` to instantiate ApiKeyManager
  - Replace existing setApiKey handler with call to `apiKeyManager.configureApiKey()`
  - _Requirements: 1.1_

- [x] 3.1 Write property test for internationalization completeness
  - **Property 4: Internationalization completeness**
  - **Validates: Requirements 4.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
