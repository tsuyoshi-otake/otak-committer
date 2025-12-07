# Implementation Plan

- [x] 1. Create i18n infrastructure
  - Create directory structure for i18n module
  - Implement LocaleDetector class to detect VS Code display language
  - Implement TranslationManager class with singleton pattern
  - Create translation file loader
  - _Requirements: 1.1, 1.2, 4.3_

- [x] 1.1 Update LocaleDetector for new languages
  - Update LocaleDetector to support Vietnamese (vi), Korean (ko), and Chinese Simplified (zh-cn)
  - Update SupportedLocale type definition
  - Update locale detection logic to handle new language codes
  - _Requirements: 1.2, 1.3, 1.4, 1.6_

- [x] 1.2 Add Traditional Chinese locale support
  - Update LocaleDetector to support Chinese Traditional (zh-tw)
  - Update SupportedLocale type definition to include 'zh-tw'
  - Update locale detection logic to handle zh-tw language code
  - _Requirements: 1.5_

- [x] 2. Create translation files
  - Create English translation file (en.json) with all UI strings
  - Create Japanese translation file (ja.json) with all UI strings
  - Organize translations by feature area (commands, messages, statusBar, errors, warnings)
  - _Requirements: 2.1, 3.1, 3.2, 3.3_

- [x] 2.1 Add Vietnamese translation file
  - Create Vietnamese translation file (vi.json) with all UI strings
  - Translate all keys from English to Vietnamese
  - _Requirements: 1.2, 2.1, 3.1_

- [x] 2.2 Add Korean translation file
  - Create Korean translation file (ko.json) with all UI strings
  - Translate all keys from English to Korean
  - _Requirements: 1.3, 2.1, 3.1_

- [x] 2.3 Add Chinese (Simplified) translation file
  - Create Chinese (Simplified) translation file (zh-cn.json) with all UI strings
  - Translate all keys from English to Chinese (Simplified)
  - _Requirements: 1.4, 2.1, 3.1_

- [x] 2.4 Add Chinese (Traditional) translation file
  - Create Chinese (Traditional) translation file (zh-tw.json) with all UI strings
  - Translate all keys from English to Chinese (Traditional)
  - _Requirements: 1.5, 2.1, 3.1_

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

- [x] 3.2.1 Write property test for Vietnamese locale
  - **Property 2: Vietnamese locale returns Vietnamese translations**
  - **Validates: Requirements 1.2**

- [x] 3.2.2 Write property test for Korean locale
  - **Property 3: Korean locale returns Korean translations**
  - **Validates: Requirements 1.3**

- [x] 3.2.3 Write property test for Chinese locale
  - **Property 4: Chinese locale returns Chinese translations**
  - **Validates: Requirements 1.4**

- [x] 3.2.3.1 Write property test for Traditional Chinese locale
  - **Property: Traditional Chinese locale returns Traditional Chinese translations**
  - **Validates: Requirements 1.5**

- [x] 3.2.4 Write property test for unsupported locale fallback
  - **Property 5: Unsupported locale returns English translations**
  - **Validates: Requirements 1.6**

- [x] 3.3 Write property test for locale switching
  - **Property 6: Locale switching updates translations**
  - **Validates: Requirements 1.7**

- [x] 3.4 Write property test for missing translation fallback
  - **Property 7: Missing translation fallback**
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

- [x] 13. Final verification for new languages
  - Test Vietnamese translations in all commands
  - Test Korean translations in all commands
  - Test Chinese Simplified translations in all commands
  - Verify locale detection works correctly for all new languages
  - _Requirements: 1.2, 1.3, 1.4, 1.6, 1.7_

- [x] 14. Add Traditional Chinese support and verification
  - Test Traditional Chinese translations in all commands
  - Verify locale detection works correctly for zh-tw
  - _Requirements: 1.5_

- [x] 15. Implement LanguagePreferenceManager
  - Create LanguagePreferenceManager class to manage commit message language preferences
  - Implement getPreferredLanguage() to return user preference or fall back to UI locale
  - Implement setPreferredLanguage() to persist user's language choice
  - Implement clearPreferredLanguage() to remove preference
  - Implement hasPreference() to check if user has set a preference
  - Use ConfigManager for storage under 'otakCommitter.commitLanguage'
  - _Requirements: 5.6, 5.7_

- [x] 15.1 Write property test for manual language preference override
  - **Property 13: Manual language preference overrides UI language**
  - **Validates: Requirements 5.6, 5.7**

- [x] 16. Update message length configuration
  - Locate message length constants in prompt generation code
  - Update Simple style limit from 50 to 100 characters
  - Update Normal style limit from 72 to 144 characters
  - Update Detailed style limit from 100 to 200 characters
  - Update OpenAI prompts to include new length limits
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 16.4 Update OpenAI API max_tokens configuration
  - Update max_tokens to be dynamic based on message style
  - Use 1.5x multiplier for Japanese character buffer
  - Simple: 150 tokens, Normal: 216 tokens, Detailed: 300 tokens
  - Implementation in src/services/openai.ts
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 16.1 Write property test for Simple style length limit
  - **Property 14: Simple style respects 100 character limit**
  - **Validates: Requirements 6.1**

- [x] 16.2 Write property test for Normal style length limit
  - **Property 15: Normal style respects 144 character limit**
  - **Validates: Requirements 6.2**

- [x] 16.3 Write property test for Detailed style length limit
  - **Property 16: Detailed style respects 200 character limit**
  - **Validates: Requirements 6.3**

- [x] 17. Integrate language preference with commit message generation
  - Create locale to language name mapping (ja→japanese, en→english, vi→vietnamese, ko→korean, zh-cn→chinese)
  - Update CommitCommand to use LanguagePreferenceManager.getPreferredLanguage()
  - Pass the preferred language to prompt generation
  - Ensure language preference is used instead of hardcoded language
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 17.1 Write property test for Japanese UI commit messages
  - **Property 8: Japanese UI generates Japanese commit messages**
  - **Validates: Requirements 5.1**

- [x] 17.2 Write property test for Vietnamese UI commit messages
  - **Property 9: Vietnamese UI generates Vietnamese commit messages**
  - **Validates: Requirements 5.2**

- [x] 17.3 Write property test for Korean UI commit messages
  - **Property 10: Korean UI generates Korean commit messages**
  - **Validates: Requirements 5.3**

- [x] 17.4 Write property test for Chinese UI commit messages
  - **Property 11: Chinese UI generates Chinese commit messages**
  - **Validates: Requirements 5.4**

- [x] 17.5 Write property test for unsupported UI language commit messages
  - **Property 12: Unsupported UI language generates English commit messages**
  - **Validates: Requirements 5.5**

- [x] 18. Update ConfigCommand for language preference
  - Add option to set commit message language preference
  - Update language selection UI to persist preference
  - Add option to clear preference and revert to auto-detection
  - Update status bar to show current commit message language
  - _Requirements: 5.6, 5.7_

- [ ] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 20. Final verification for commit message language and length
  - Test commit message generation in all supported languages
  - Verify manual language preference overrides UI language
  - Verify language preference persists across sessions
  - Test all message styles respect new length limits
  - Verify auto-detection works when no preference is set
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3_
