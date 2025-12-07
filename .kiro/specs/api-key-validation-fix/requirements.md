# Requirements Document

## Introduction

This document specifies the requirements for fixing the API key validation logic in the otak-committer VS Code extension. The current implementation rejects valid API keys that are shorter than expected, including test keys and some legitimate OpenAI API keys. The validation should be more flexible while still providing basic format checking.

## Glossary

- **Extension**: The otak-committer VS Code extension
- **API Key**: The OpenAI API authentication token (format: sk-...)
- **ApiKeyManager**: The service class that manages API key configuration
- **Format Validation**: The process of checking if an API key matches the expected pattern

## Requirements

### Requirement 1

**User Story:** As a user, I want to enter any API key that starts with "sk-", so that I can use test keys, development keys, and all valid OpenAI API keys.

#### Acceptance Criteria

1. WHEN a user enters an API key starting with "sk-" THEN the Extension SHALL accept the key regardless of length
2. WHEN a user enters "sk-" with no additional characters THEN the Extension SHALL reject the key
3. WHEN a user enters an API key not starting with "sk-" THEN the Extension SHALL reject the key
4. WHEN a user enters an empty string THEN the Extension SHALL allow cancellation without error
5. WHEN a user enters only whitespace THEN the Extension SHALL reject the key

### Requirement 2

**User Story:** As a developer, I want the validation to be simple and permissive, so that future changes to OpenAI's key format don't break the extension.

#### Acceptance Criteria

1. THE Extension SHALL validate only the "sk-" prefix
2. THE Extension SHALL accept any non-empty characters after "sk-"
3. THE Extension SHALL trim whitespace before validation
4. THE Extension SHALL provide clear error messages for invalid formats
5. THE Extension SHALL not enforce minimum length requirements beyond the prefix
