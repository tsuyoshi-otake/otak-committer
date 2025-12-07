# Design Document

## Overview

This design document outlines the fix for the API key validation logic in the ApiKeyManager service. The current implementation uses a regex pattern `/^sk-[a-zA-Z0-9]{40,}$/` that requires exactly 40 or more alphanumeric characters after the "sk-" prefix. This is too restrictive and rejects valid API keys, including test keys and some legitimate OpenAI keys.

The fix will:
1. Simplify the validation regex to only require "sk-" prefix plus at least one character
2. Maintain security by still validating the prefix format
3. Allow flexibility for different key lengths and formats
4. Keep the existing validation flow and error handling

## Architecture

The solution modifies only the ApiKeyManager service class:

```
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ApiKeyManager (MODIFIED)                             │  │
│  │  - API_KEY_PATTERN: /^sk-.+$/ (CHANGED)              │  │
│  │  - validateKeyFormat() (logic unchanged)              │  │
│  │  - promptForApiKey() (uses updated pattern)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

No other components need to be modified.

## Components and Interfaces

### ApiKeyManager (Modified Component)

Only the validation pattern constant needs to change:

**Current:**
```typescript
private static readonly API_KEY_PATTERN = /^sk-[a-zA-Z0-9]{40,}$/;
```

**New:**
```typescript
private static readonly API_KEY_PATTERN = /^sk-.+$/;
```

The `validateKeyFormat()` method logic remains unchanged - it will use the new pattern automatically.

### Validation Logic

The updated validation will:
1. Trim whitespace from input
2. Check if the trimmed string matches `/^sk-.+$/`
3. Accept any key with "sk-" followed by at least one character
4. Reject empty strings, whitespace-only strings, and strings without "sk-" prefix

## Data Models

### API Key Format (Updated)

OpenAI API keys format:
- Prefix: `sk-`
- Followed by one or more characters (any characters except whitespace)
- No minimum or maximum length enforced

Updated validation regex: `/^sk-.+$/`

Where:
- `^` - Start of string
- `sk-` - Literal "sk-" prefix
- `.+` - One or more of any character (except newline)
- `$` - End of string

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Property 1: Prefix validation
*For any* string starting with "sk-" followed by at least one non-whitespace character, the validation should accept it, and for any string not matching this pattern, the validation should reject it
**Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2**

Property 2: Whitespace handling
*For any* string with leading or trailing whitespace, the validation should trim the whitespace before checking the pattern
**Validates: Requirements 2.3**

Property 3: Empty input handling
*For any* empty or whitespace-only string, the validation should reject it without causing errors
**Validates: Requirements 1.4, 1.5**

## Error Handling

No changes to error handling are needed. The existing error messages and flow remain appropriate:

- **Invalid Format**: Display localized error message
- **Empty Input**: Allow cancellation (no error)
- **Whitespace Only**: Treat as invalid format

## Testing Strategy

### Unit Testing

Update existing unit tests to reflect the new validation rules:

1. **Valid Keys** (should pass):
   - `sk-a` (minimum valid key)
   - `sk-test123`
   - `sk-proj-abc123def456`
   - `sk-` followed by 40+ characters (existing valid keys)
   - Keys with special characters after prefix

2. **Invalid Keys** (should fail):
   - `sk-` (prefix only, no characters after)
   - `invalid-key`
   - Empty string
   - Whitespace only
   - Keys without "sk-" prefix

3. **Edge Cases**:
   - Keys with leading/trailing whitespace (should be trimmed and validated)
   - Keys with newlines or tabs

### Property-Based Testing

Update existing property-based tests:

1. **Property 1: Prefix Validation**
   - Generate random strings with and without "sk-" prefix
   - Verify validation correctly accepts/rejects based on pattern
   - Test with various lengths and character types

2. **Property 2: Whitespace Handling**
   - Generate valid keys with random whitespace padding
   - Verify trimming occurs before validation
   - Ensure trimmed result is validated correctly

3. **Property 3: Empty Input Handling**
   - Generate empty and whitespace-only strings
   - Verify rejection without errors
   - Test boundary cases

### Test Configuration

- Each property-based test will run a minimum of 100 iterations
- Tests will be tagged with: `**Feature: api-key-validation-fix, Property {number}: {property_text}**`
- Use existing fast-check library and test infrastructure

## Implementation Notes

### Backward Compatibility

- Existing valid API keys (40+ characters) will continue to work
- New shorter keys (test keys, etc.) will now be accepted
- No breaking changes to the API or storage format

### Security Considerations

- The validation still ensures the "sk-" prefix is present
- Actual API key validity is checked by OpenAI's API during optional validation
- Format validation is a basic sanity check, not a security measure
- The real security comes from secure storage and the optional API validation

### Performance Considerations

- Regex change has no performance impact
- Validation remains O(1) operation

### Migration Path

1. Update the API_KEY_PATTERN constant in ApiKeyManager
2. Update unit tests to reflect new validation rules
3. Update property-based tests to test new pattern
4. No data migration needed - existing keys remain valid

## Rationale

The original 40-character minimum was based on typical OpenAI API key lengths, but:
1. OpenAI may issue keys of different lengths for different purposes
2. Test keys and development keys may be shorter
3. Future key formats may change
4. The format validation is just a sanity check - the real validation happens via API call

By simplifying to just require the "sk-" prefix plus at least one character, we:
1. Accept all legitimate OpenAI keys
2. Still catch obvious typos and invalid inputs
3. Future-proof against format changes
4. Maintain a simple, understandable validation rule
