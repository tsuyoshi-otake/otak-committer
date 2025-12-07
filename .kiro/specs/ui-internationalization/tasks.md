# Implementation Plan

- [x] 1. Create i18n infrastructure
  - Create directory structure for i18n module
  - Implement LocaleDetector class to detect VS Code display language
  - Implement TranslationManager class with singleton pattern
  - Create translation file loader
  - _Requirements: 1.1, 1.2, 4.3_

- [x] 2. Create translation files
  - Create English translation file (en.json) with all UI strings
  - Create Japanese translation file (ja.json) with all UI strings
  - Organize translations by feature area (commands, messages, statusBar, errors, warnings)
  - _Requirements: 2.1, 3.1, 3.2, 3.3_

- [x] 3. Implement translation function with parameter interpolation
  - Add parameter interpolation support using {paramName} syntax
  - Implement fallback logic for missing keys
  - Add error handling for malformed translations
  - _Requirements: 2.3, 4.1_

- [x] 3.1 Write property test for Japanese locale
  - **Property 1: Japanese locale returns Japanese translations**
  - **Validates: Requirements 1.1**

- [x] 3.2 Write property test for English fallback
  - **Property 2: Non-Japanese locale returns English translations**
  - **Validates: Requirements 1.2**

- [x] 3.3 Write property test for locale switching
  - **Property 3: Locale switching updates translations**
  - **Validates: Requirements 1.3**

- [x] 3.4 Write property test for missing translation fallback
  - **Property 4: Missing translation fallback**
  - **Validates: Requirements 2.3**

- [x] 3.5 Write unit tests for parameter interpolation
  - Test parameter replacement with various types
  - Test edge cases (missing parameters, special characters)
  - _Requirements: 4.1_

- [x] 4. Export i18n module
  - Create index.ts to export LocaleDetector and TranslationManager
  - Create helper function for easy access to translation function
  - Add TypeScript type definitions
  - _Requirements: 2.2, 4.1_

- [x] 5. Integrate translations into StatusBarManager
  - Replace hardcoded strings in StatusBarManager with translation calls
  - Update tooltip text to use translations
  - Test status bar display in both languages
  - _Requirements: 3.3, 4.2_

- [x] 6. Integrate translations into ConfigCommand
  - Replace hardcoded messages in language change command
  - Replace hardcoded messages in message style change command
  - Test command execution in both languages
  - _Requirements: 3.1, 4.2_

- [x] 7. Integrate translations into CommitCommand
  - Replace hardcoded warning messages with translations
  - Test commit message generation flow in both languages
  - _Requirements: 3.1, 4.2_

- [x] 8. Integrate translations into PRCommand
  - Replace hardcoded error and warning messages with translations
  - Replace hardcoded information messages with translations
  - Test PR generation flow in both languages
  - _Requirements: 3.1, 4.2_

- [x] 9. Integrate translations into IssueCommand
  - Replace hardcoded error and information messages with translations
  - Test issue generation flow in both languages
  - _Requirements: 3.1, 4.2_

- [x] 10. Integrate translations into command registration
  - Replace hardcoded messages in setApiKey command
  - Test API key configuration flow in both languages
  - _Requirements: 3.1, 4.2_

- [x] 11. Write integration tests
  - Test translations in actual command execution
  - Test locale detection with different VS Code language settings
  - Test dynamic language switching
  - _Requirements: 1.3, 4.2_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
