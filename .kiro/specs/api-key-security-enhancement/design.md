# Design Document

## Overview

This design document outlines the security enhancement for OpenAI API key handling in the otak-committer VS Code extension. The current implementation has a critical security vulnerability: the API key input field does not properly mask the entered value, potentially exposing sensitive credentials to shoulder-surfing attacks or screen recordings.

The enhancement will:
1. Enable password mode for the API key input box to mask entered characters
2. Add API key format validation before storage
3. Implement optional API key validation with OpenAI
4. Provide options to update or remove existing API keys
5. Ensure all user-facing messages are internationalized

## Architecture

The solution follows the existing extension architecture with minimal changes:

```
┌─────────────────────────────────────────────────────────────┐
│                    Command Layer                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  commandRegistration.ts                               │  │
│  │  - setApiKey command handler (MODIFIED)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ApiKeyManager (NEW)                                  │  │
│  │  - validateKeyFormat()                                │  │
│  │  - promptForApiKey()                                  │  │
│  │  - handleExistingKey()                                │  │
│  │  - validateWithOpenAI()                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Infrastructure Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  StorageManager (EXISTING)                            │  │
│  │  - getApiKey()                                        │  │
│  │  - setApiKey()                                        │  │
│  │  - deleteApiKey()                                     │  │
│  │  - hasApiKey()                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OpenAIService (EXISTING)                             │  │
│  │  - validateApiKey()                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Internationalization                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  i18n/locales/*.json (MODIFIED)                       │  │
│  │  - New translation keys for API key management       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### ApiKeyManager (New Component)

A new service class that encapsulates all API key management logic:

```typescript
export class ApiKeyManager {
    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly storage: StorageManager
    );

    /**
     * Main entry point for API key configuration
     */
    async configureApiKey(): Promise<void>;

    /**
     * Validates API key format (sk-...)
     */
    validateKeyFormat(key: string): boolean;

    /**
     * Prompts user for API key with password masking
     */
    async promptForApiKey(): Promise<string | undefined>;

    /**
     * Handles existing API key scenario
     */
    async handleExistingKey(): Promise<'update' | 'remove' | 'cancel'>;

    /**
     * Validates API key with OpenAI API
     */
    async validateWithOpenAI(apiKey: string): Promise<boolean>;

    /**
     * Removes API key from storage
     */
    async removeApiKey(): Promise<void>;
}
```

### Modified Command Handler

The `setApiKey` command handler in `commandRegistration.ts` will be simplified to delegate to `ApiKeyManager`:

```typescript
registry.register({
    id: 'otak-committer.setApiKey',
    title: 'Set API Key',
    category: 'otak-committer',
    handler: async () => {
        const apiKeyManager = new ApiKeyManager(context, new StorageManager(context));
        await apiKeyManager.configureApiKey();
    }
});
```

## Data Models

### API Key Format

OpenAI API keys follow a specific format:
- Prefix: `sk-`
- Followed by alphanumeric characters
- Typical length: 48-51 characters total

Validation regex: `/^sk-[a-zA-Z0-9]{40,}$/`

### User Action Types

```typescript
type ApiKeyAction = 'update' | 'remove' | 'cancel';
```

### Validation Result

```typescript
interface ValidationResult {
    isValid: boolean;
    error?: string;
}
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Format validation correctness
*For any* string input, the format validation should accept strings matching the pattern `sk-[a-zA-Z0-9]{40,}` and reject all other strings, and only validated strings should be stored
**Validates: Requirements 1.3, 1.4, 1.5**

Property 2: Complete key removal
*For any* stored API key, when the removal operation is performed, the key should not exist in any storage location (SecretStorage, GlobalState backup, or legacy Configuration)
**Validates: Requirements 3.4**

Property 3: API key confidentiality in error messages
*For any* error message generated by the API key management system, the message should not contain the actual API key value
**Validates: Requirements 4.4**

Property 4: Internationalization completeness
*For all* user-facing messages in the API key management flow, the messages should use the i18n translation system rather than hardcoded strings
**Validates: Requirements 4.5**

## Error Handling

### Input Validation Errors

- **Invalid Format**: Display localized error message explaining the expected format
- **Empty Input**: Treat as cancellation, no error message needed
- **Whitespace Only**: Treat as invalid format

### Storage Errors

- **SecretStorage Unavailable**: Fall back to encrypted GlobalState backup (handled by existing StorageManager)
- **All Storage Failed**: Display error message and suggest checking VS Code permissions
- **Migration Errors**: Log error but continue with fallback storage

### API Validation Errors

- **Network Error**: Display error with option to skip validation
- **Invalid Credentials**: Display error with option to re-enter key
- **Rate Limit**: Display error explaining rate limit and suggest trying later
- **Timeout**: Display error with option to skip validation

### User Cancellation

- **Input Cancelled**: Silent cancellation, no error message
- **Action Cancelled**: Return to previous state without changes

## Testing Strategy

### Unit Testing

Unit tests will cover specific scenarios and edge cases:

1. **Input Box Configuration**
   - Verify password mode is enabled
   - Verify placeholder text is set correctly
   - Verify prompt text is set correctly

2. **Format Validation**
   - Valid key formats (sk-... with various lengths)
   - Invalid prefixes
   - Empty strings
   - Whitespace-only strings
   - Special characters

3. **Existing Key Handling**
   - User chooses to update
   - User chooses to remove
   - User cancels operation

4. **API Validation Flow**
   - Successful validation
   - Failed validation
   - Network errors
   - User skips validation

5. **Internationalization**
   - All messages use i18n keys
   - Keys exist in all locale files

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using the fast-check library (already used in the project):

1. **Property 1: Format Validation Correctness**
   - Generate random strings with valid and invalid formats
   - Verify that validation correctly accepts/rejects based on format
   - Verify that only valid keys are stored

2. **Property 2: Complete Key Removal**
   - Generate random API keys and storage states
   - Verify that removal deletes from all storage locations
   - Verify that hasApiKey returns false after removal

3. **Property 3: API Key Confidentiality**
   - Generate random API keys and error scenarios
   - Verify that error messages never contain the actual key
   - Check all error message paths

4. **Property 4: Internationalization Completeness**
   - Verify all user-facing strings use i18n system
   - Check that no hardcoded English strings exist in the code

### Test Configuration

- Each property-based test will run a minimum of 100 iterations
- Each test will be tagged with the format: `**Feature: api-key-security-enhancement, Property {number}: {property_text}**`
- Tests will use the existing test infrastructure in `src/test/`

### Integration Testing

Integration tests will verify the complete flow:

1. **End-to-End Key Configuration**
   - Set new key → Validate → Store → Retrieve
   - Update existing key → Validate → Store → Retrieve
   - Remove key → Verify deletion

2. **Storage Migration**
   - Verify legacy keys are migrated correctly
   - Verify password masking works after migration

3. **Error Recovery**
   - Storage failures with fallback
   - Validation failures with retry

## Implementation Notes

### Backward Compatibility

- Existing API keys in storage will continue to work
- Legacy storage migration is already handled by StorageManager
- No breaking changes to existing APIs

### Security Considerations

1. **Password Masking**: Use VS Code's built-in password mode for input masking
2. **No Logging**: Never log actual API key values
3. **Error Messages**: Sanitize all error messages to remove key values
4. **Memory**: Clear sensitive data from memory after use (handled by VS Code)

### Performance Considerations

- Format validation is O(1) regex check
- API validation is optional and async (doesn't block UI)
- Storage operations are already optimized in StorageManager

### Internationalization

New translation keys to be added to all locale files:

```json
{
  "apiKey": {
    "enterKey": "Enter your OpenAI API key",
    "placeholder": "sk-...",
    "invalidFormat": "Invalid API key format. Expected format: sk-...",
    "keyExists": "An API key is already configured",
    "chooseAction": "Choose an action",
    "updateKey": "Update API Key",
    "removeKey": "Remove API Key",
    "cancel": "Cancel",
    "removed": "API key removed successfully",
    "validatePrompt": "Would you like to validate the API key with OpenAI?",
    "validating": "Validating API key...",
    "validationSuccess": "API key is valid",
    "validationFailed": "API key validation failed: {reason}",
    "retryPrompt": "Would you like to enter a different API key?"
  }
}
```

### Dependencies

- No new external dependencies required
- Uses existing infrastructure:
  - `StorageManager` for secure storage
  - `OpenAIService` for API validation
  - `i18n` system for internationalization
  - `fast-check` for property-based testing

## Migration Path

1. **Phase 1**: Implement ApiKeyManager with password masking
2. **Phase 2**: Add format validation
3. **Phase 3**: Add optional API validation
4. **Phase 4**: Add update/remove functionality
5. **Phase 5**: Add internationalization
6. **Phase 6**: Add comprehensive tests

No data migration is required as the storage format remains unchanged.
