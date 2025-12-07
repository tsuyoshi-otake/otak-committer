# Design Document

## Overview

This design implements a minimal internationalization (i18n) system for the otak-committer VS Code extension, supporting Japanese, English, Vietnamese, Korean, Chinese (Simplified), and Chinese (Traditional) languages. The system automatically detects the VS Code display language and provides appropriate translations for all user-facing messages. Additionally, it extends commit message generation to support multiple languages and adjusts message length limits.

The design follows these principles:
- **Simplicity**: Minimal implementation without over-engineering
- **Maintainability**: Centralized translation management
- **Seamless Integration**: Easy to integrate with existing code
- **Automatic Detection**: Uses VS Code's display language setting
- **Language Persistence**: Remembers user's language preference for commit messages
- **Flexible Message Length**: Provides longer commit messages for better context

## Architecture

The i18n system consists of three main components:

1. **LocaleDetector**: Detects the current VS Code display language
2. **TranslationManager**: Manages translation strings and provides translation API
3. **Integration Layer**: Helper functions to integrate translations into existing code

```
┌─────────────────────────────────────────┐
│         VS Code Extension               │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     LocaleDetector                │ │
│  │  - Detects display language       │ │
│  │  - Returns locale code            │ │
│  │    (ja, en, vi, ko, zh-cn, zh-tw) │ │
│  └───────────────────────────────────┘ │
│                 │                       │
│                 ▼                       │
│  ┌───────────────────────────────────┐ │
│  │   TranslationManager              │ │
│  │  - Loads translation files        │ │
│  │  - Provides t() function          │ │
│  │  - Handles fallback to English    │ │
│  └───────────────────────────────────┘ │
│                 │                       │
│                 ▼                       │
│  ┌───────────────────────────────────┐ │
│  │   Commands & UI Components        │ │
│  │  - Use t() for all messages       │ │
│  │  - Replace hardcoded strings      │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Components and Interfaces

### LocaleDetector

Detects the current VS Code display language.

```typescript
export type SupportedLocale = 'ja' | 'en' | 'vi' | 'ko' | 'zh-cn' | 'zh-tw';

export class LocaleDetector {
    /**
     * Get the current locale
     * @returns Supported locale code ('ja', 'en', 'vi', 'ko', 'zh-cn', 'zh-tw')
     */
    static getLocale(): SupportedLocale;
}
```

**Implementation Details**:
- Uses `vscode.env.language` to get the display language
- Returns 'ja' if the language starts with 'ja' (e.g., 'ja', 'ja-JP')
- Returns 'vi' if the language starts with 'vi' (e.g., 'vi', 'vi-VN')
- Returns 'ko' if the language starts with 'ko' (e.g., 'ko', 'ko-KR')
- Returns 'zh-cn' if the language is 'zh-cn' or 'zh-hans' (Simplified Chinese)
- Returns 'zh-tw' if the language is 'zh-tw' or 'zh-hant' (Traditional Chinese)
- Returns 'en' for all other languages (default fallback)

### TranslationManager

Manages translations and provides the translation API.

```typescript
export class TranslationManager {
    private locale: SupportedLocale;
    private translations: Record<string, string>;
    
    constructor();
    
    /**
     * Get translated string
     * @param key - Translation key
     * @param params - Optional parameters for string interpolation
     * @returns Translated string
     */
    t(key: string, params?: Record<string, string | number>): string;
    
    /**
     * Update locale and reload translations
     * @param locale - New locale
     */
    setLocale(locale: SupportedLocale): void;
    
    /**
     * Get current locale
     * @returns Current locale code
     */
    getLocale(): SupportedLocale;
}
```

**Implementation Details**:
- Singleton pattern for global access
- Loads translations from JSON files
- Supports simple parameter interpolation using `{paramName}` syntax
- Falls back to English if translation key is missing
- Falls back to the key itself if English translation is also missing

### Language Preference Manager

Manages user's language preference for commit message generation.

```typescript
export class LanguagePreferenceManager {
    /**
     * Get the preferred language for commit messages
     * If user has manually set a language, return that
     * Otherwise, return the current UI locale
     * @returns Preferred language code
     */
    static getPreferredLanguage(): SupportedLocale;
    
    /**
     * Set user's preferred language for commit messages
     * @param locale - Language to use for commit messages
     */
    static setPreferredLanguage(locale: SupportedLocale): Promise<void>;
    
    /**
     * Clear user's language preference (revert to auto-detection)
     */
    static clearPreferredLanguage(): Promise<void>;
    
    /**
     * Check if user has manually set a language preference
     * @returns True if user has set a preference
     */
    static hasPreference(): Promise<boolean>;
}
```

**Implementation Details**:
- Uses VS Code's workspace configuration to persist language preference
- Falls back to UI locale if no preference is set
- Integrates with existing ConfigManager for storage

### Translation Files

Translation strings are stored in JSON files:

**Structure**:
```
src/
  i18n/
    locales/
      en.json    # English translations
      ja.json    # Japanese translations
      vi.json    # Vietnamese translations
      ko.json    # Korean translations
      zh-cn.json # Chinese (Simplified) translations
      zh-tw.json # Chinese (Traditional) translations
    index.ts     # Exports LocaleDetector and TranslationManager
```

**Translation File Format**:
```json
{
  "commands": {
    "generateCommit": "Generate Commit Message",
    "generatePR": "Generate Pull Request",
    "generateIssue": "Generate Issue"
  },
  "messages": {
    "apiKeyNotConfigured": "OpenAI API key is not configured. Would you like to configure it now?",
    "apiKeySaved": "API key saved successfully",
    "authRequired": "GitHub authentication is required. Please sign in."
  },
  "statusBar": {
    "configuration": "Configuration",
    "currentStyle": "Current Style",
    "setApiKey": "Set API Key",
    "openSettings": "Open Settings"
  }
}
```

## Data Models

### Locale Type

```typescript
type SupportedLocale = 'ja' | 'en' | 'vi' | 'ko' | 'zh-cn' | 'zh-tw';
```

### Translation Dictionary

```typescript
interface TranslationDictionary {
    [key: string]: string | TranslationDictionary;
}
```

### Translation Parameters

```typescript
interface TranslationParams {
    [key: string]: string | number;
}
```

### Message Length Configuration

```typescript
interface MessageLengthConfig {
    simple: number;    // 100 characters (doubled from 50)
    normal: number;    // 144 characters (increased from 72)
    detailed: number;  // 200 characters (increased from 100)
}
```

### Language Mapping for Commit Messages

Maps supported locales to language names used in the existing language system:

```typescript
const LOCALE_TO_LANGUAGE_MAP: Record<SupportedLocale, string> = {
    'ja': 'japanese',
    'en': 'english',
    'vi': 'vietnamese',
    'ko': 'korean',
    'zh-cn': 'chinese',
    'zh-tw': 'chinese-traditional'
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Japanese locale returns Japanese translations

*For any* valid translation key, when the locale is set to 'ja', the translation function should return the Japanese translation string.

**Validates: Requirements 1.1**

### Property 2: Vietnamese locale returns Vietnamese translations

*For any* valid translation key, when the locale is set to 'vi', the translation function should return the Vietnamese translation string.

**Validates: Requirements 1.2**

### Property 3: Korean locale returns Korean translations

*For any* valid translation key, when the locale is set to 'ko', the translation function should return the Korean translation string.

**Validates: Requirements 1.3**

### Property 4: Chinese locale returns Chinese translations

*For any* valid translation key, when the locale is set to 'zh-cn', the translation function should return the Chinese (Simplified) translation string.

**Validates: Requirements 1.4**

### Property 5: Traditional Chinese locale returns Traditional Chinese translations

*For any* valid translation key, when the locale is set to 'zh-tw', the translation function should return the Traditional Chinese translation string.

**Validates: Requirements 1.5**

### Property 5.1: Unsupported locale returns English translations

*For any* valid translation key and any unsupported locale value, the translation function should return the English translation string.

**Validates: Requirements 1.6**

### Property 6: Locale switching updates translations

*For any* valid translation key, when the locale is changed from one language to another, subsequent calls to the translation function should return strings in the new language.

**Validates: Requirements 1.7**

### Property 7: Missing translation fallback

*For any* translation key that exists in the English translations, if that key is missing in another language's translations, the translation function should return the English translation as a fallback.

**Validates: Requirements 2.3**

### Property 8: Japanese UI generates Japanese commit messages

*For any* commit message generation request, when the UI display language is Japanese and no manual language preference is set, the commit message should be generated in Japanese.

**Validates: Requirements 5.1**

### Property 9: Vietnamese UI generates Vietnamese commit messages

*For any* commit message generation request, when the UI display language is Vietnamese and no manual language preference is set, the commit message should be generated in Vietnamese.

**Validates: Requirements 5.2**

### Property 10: Korean UI generates Korean commit messages

*For any* commit message generation request, when the UI display language is Korean and no manual language preference is set, the commit message should be generated in Korean.

**Validates: Requirements 5.3**

### Property 11: Chinese UI generates Chinese commit messages

*For any* commit message generation request, when the UI display language is Chinese (Simplified) and no manual language preference is set, the commit message should be generated in Chinese (Simplified).

**Validates: Requirements 5.4**

### Property 12: Unsupported UI language generates English commit messages

*For any* commit message generation request, when the UI display language is unsupported and no manual language preference is set, the commit message should be generated in English.

**Validates: Requirements 5.5**

### Property 13: Manual language preference overrides UI language

*For any* commit message generation request, when a user has manually set a language preference, the commit message should be generated in that preferred language regardless of the current UI display language.

**Validates: Requirements 5.6, 5.7**

### Property 14: Simple style respects 100 character limit

*For any* commit message generated with Simple style, the message length should not exceed 100 characters.

**Validates: Requirements 6.1**

### Property 15: Normal style respects 144 character limit

*For any* commit message generated with Normal style, the message length should not exceed 144 characters.

**Validates: Requirements 6.2**

### Property 16: Detailed style respects 200 character limit

*For any* commit message generated with Detailed style, the message length should not exceed 200 characters.

**Validates: Requirements 6.3**

## Error Handling

The i18n system handles errors gracefully:

1. **Missing Translation Key**: If a key doesn't exist in any language file, return the key itself as a fallback
2. **Invalid Locale**: If an invalid locale is provided, default to English
3. **Malformed Translation Files**: Log errors and fall back to English translations
4. **Parameter Interpolation Errors**: If a parameter is missing, leave the placeholder in the string

Error handling strategy:
- Never throw exceptions that would break the extension
- Always provide a usable string, even if it's not translated
- Log warnings for missing translations to help developers identify gaps

## Testing Strategy

### Unit Tests

Unit tests will cover:
- LocaleDetector returns correct locale for different VS Code language settings
- TranslationManager loads translation files correctly
- Parameter interpolation works with various input types
- Edge cases: empty strings, special characters, nested keys

### Property-Based Tests

Property-based tests will verify the correctness properties defined above. We will use the `fast-check` library for property-based testing in TypeScript.

Each property-based test will:
- Run a minimum of 100 iterations
- Generate random translation keys and locale values
- Verify the expected behavior holds across all inputs
- Be tagged with a comment referencing the design document property

**Test Configuration**:
- Library: fast-check (already in devDependencies)
- Minimum iterations: 100
- Test file location: `src/i18n/__tests__/`

**Property Test Tags**:
Each property test must include a comment in this format:
```typescript
// Feature: ui-internationalization, Property 1: Japanese locale returns Japanese translations
```

### Integration Tests

Integration tests will verify:
- Translations work correctly in actual command execution
- Status bar updates with correct language
- VS Code API integration works as expected

## Implementation Notes

### VS Code Language Detection

VS Code provides the display language through `vscode.env.language`. This returns:
- `'ja'` or `'ja-JP'` for Japanese
- `'vi'` or `'vi-VN'` for Vietnamese
- `'ko'` or `'ko-KR'` for Korean
- `'zh-cn'` or `'zh-hans'` for Chinese (Simplified)
- `'zh-tw'` or `'zh-hant'` for Chinese (Traditional)
- `'en'` or `'en-US'` for English
- Other language codes for other languages

Our implementation will:
- Check if the language code starts with 'ja' → return 'ja'
- Check if the language code starts with 'vi' → return 'vi'
- Check if the language code starts with 'ko' → return 'ko'
- Check if the language code is 'zh-cn' or 'zh-hans' → return 'zh-cn'
- Check if the language code is 'zh-tw' or 'zh-hant' → return 'zh-tw'
- Default to 'en' for all other cases

### Translation File Organization

Keep translation files flat and organized by feature area:
- `commands.*` - Command titles and descriptions
- `messages.*` - User-facing messages
- `statusBar.*` - Status bar text
- `errors.*` - Error messages
- `warnings.*` - Warning messages

### Parameter Interpolation

Support simple parameter interpolation:
```typescript
// Translation: "Language changed to {language}"
t('messages.languageChanged', { language: 'Japanese' })
// Result: "Language changed to Japanese"
```

Implementation uses simple string replacement with `{paramName}` syntax.

### Performance Considerations

- Load translation files once at initialization
- Cache translations in memory
- No file I/O during translation lookups
- Minimal overhead for translation function calls

### Migration Strategy

To integrate translations into existing code:

1. Create translation keys for all existing hardcoded strings
2. Replace hardcoded strings with `t()` function calls
3. Test each command/component after migration
4. Maintain backward compatibility during transition

Example migration:
```typescript
// Before
vscode.window.showInformationMessage('API key saved successfully');

// After
vscode.window.showInformationMessage(t('messages.apiKeySaved'));
```

### Commit Message Language Integration

The commit message generation system needs to be updated to support multiple languages:

1. **Language Detection Flow**:
   - Check if user has manually set a language preference
   - If yes, use that language
   - If no, use the current UI locale

2. **Integration with Existing Language System**:
   - The extension already has language files (src/languages/*.ts) for commit messages
   - Map SupportedLocale to existing language names: ja→japanese, en→english, vi→vietnamese, ko→korean, zh-cn→chinese, zh-tw→chinese-traditional
   - Pass the appropriate language to the OpenAI prompt generation

3. **Configuration Storage**:
   - Store language preference in workspace configuration under `otakCommitter.commitLanguage`
   - Use ConfigManager for consistent storage access

4. **Language Selection UI**:
   - Update the existing language selection command to set the preference
   - Show current language in status bar
   - Allow users to clear preference and revert to auto-detection

### Message Length Configuration

Update the message length limits in the prompt generation:

1. **Current Implementation**:
   - Simple: 50 characters
   - Normal: 72 characters
   - Detailed: 100 characters

2. **New Implementation**:
   - Simple: 100 characters (2x increase)
   - Normal: 144 characters (2x increase)
   - Detailed: 200 characters (2x increase)

3. **Implementation Location**:
   - Update constants in `src/services/prompt.ts` or wherever message length is configured
   - Ensure the OpenAI prompt includes the correct length limit
   - Update any validation that checks message length

4. **API max_tokens Configuration**:
   - The OpenAI API `max_tokens` parameter must be adjusted to accommodate longer messages
   - Japanese characters require approximately 1 token per character
   - Use 1.5x multiplier for buffer: `max_tokens = charLimit * 1.5`
   - Simple: 100 chars → 150 tokens
   - Normal: 144 chars → 216 tokens
   - Detailed: 200 chars → 300 tokens
   - Implementation in `src/services/openai.ts`
