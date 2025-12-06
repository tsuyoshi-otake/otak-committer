# Design Document

## Overview

This design implements a minimal internationalization (i18n) system for the otak-committer VS Code extension, supporting Japanese and English languages. The system automatically detects the VS Code display language and provides appropriate translations for all user-facing messages.

The design follows these principles:
- **Simplicity**: Minimal implementation without over-engineering
- **Maintainability**: Centralized translation management
- **Seamless Integration**: Easy to integrate with existing code
- **Automatic Detection**: Uses VS Code's display language setting

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
│  │  - Returns 'ja' or 'en'           │ │
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
export class LocaleDetector {
    /**
     * Get the current locale
     * @returns 'ja' for Japanese, 'en' for English or other languages
     */
    static getLocale(): 'ja' | 'en';
}
```

**Implementation Details**:
- Uses `vscode.env.language` to get the display language
- Returns 'ja' if the language starts with 'ja' (e.g., 'ja', 'ja-JP')
- Returns 'en' for all other languages (default fallback)

### TranslationManager

Manages translations and provides the translation API.

```typescript
export class TranslationManager {
    private locale: 'ja' | 'en';
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
    setLocale(locale: 'ja' | 'en'): void;
}
```

**Implementation Details**:
- Singleton pattern for global access
- Loads translations from JSON files
- Supports simple parameter interpolation using `{paramName}` syntax
- Falls back to English if translation key is missing
- Falls back to the key itself if English translation is also missing

### Translation Files

Translation strings are stored in JSON files:

**Structure**:
```
src/
  i18n/
    locales/
      en.json    # English translations
      ja.json    # Japanese translations
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
type Locale = 'ja' | 'en';
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

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Japanese locale returns Japanese translations

*For any* valid translation key, when the locale is set to 'ja', the translation function should return the Japanese translation string.

**Validates: Requirements 1.1**

### Property 2: Non-Japanese locale returns English translations

*For any* valid translation key and any non-Japanese locale value, the translation function should return the English translation string.

**Validates: Requirements 1.2**

### Property 3: Locale switching updates translations

*For any* valid translation key, when the locale is changed from one language to another, subsequent calls to the translation function should return strings in the new language.

**Validates: Requirements 1.3**

### Property 4: Missing translation fallback

*For any* translation key that exists in the English translations, if that key is missing in another language's translations, the translation function should return the English translation as a fallback.

**Validates: Requirements 2.3**

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
- `'en'` or `'en-US'` for English
- Other language codes for other languages

Our implementation will:
- Check if the language code starts with 'ja'
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
