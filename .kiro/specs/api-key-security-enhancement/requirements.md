# Requirements Document

## Introduction

This document specifies the requirements for enhancing the security of OpenAI API key handling in the otak-committer VS Code extension. The current implementation has a security vulnerability where the API key input field does not properly mask the entered value, potentially exposing sensitive credentials. This enhancement will ensure that API keys are properly protected during input and storage.

## Glossary

- **Extension**: The otak-committer VS Code extension
- **API Key**: The OpenAI API authentication token (format: sk-...)
- **Input Box**: VS Code's showInputBox UI component for user text input
- **SecretStorage**: VS Code's secure storage API for sensitive data
- **StorageManager**: The extension's unified storage management component
- **Password Mode**: Input box configuration that masks entered characters

## Requirements

### Requirement 1

**User Story:** As a user, I want my OpenAI API key to be masked when I enter it, so that it cannot be seen by others looking at my screen.

#### Acceptance Criteria

1. WHEN a user invokes the "Set OpenAI API Key" command THEN the Extension SHALL display an input box with password mode enabled
2. WHEN a user types characters into the API key input box THEN the Extension SHALL display masked characters instead of the actual input
3. WHEN a user completes API key entry THEN the Extension SHALL validate the key format before storage
4. WHEN an invalid API key format is entered THEN the Extension SHALL display an error message and SHALL NOT store the invalid key
5. WHEN a valid API key is entered THEN the Extension SHALL store it in SecretStorage and SHALL display a success confirmation

### Requirement 2

**User Story:** As a user, I want to verify my API key is working, so that I can confirm the configuration is correct.

#### Acceptance Criteria

1. WHEN a user stores an API key THEN the Extension SHALL offer to validate the key with OpenAI
2. WHEN a user chooses to validate the key THEN the Extension SHALL attempt to connect to the OpenAI API
3. WHEN the API key validation succeeds THEN the Extension SHALL display a success message
4. WHEN the API key validation fails THEN the Extension SHALL display an error message with the failure reason
5. WHEN validation fails THEN the Extension SHALL offer to re-enter the API key

### Requirement 3

**User Story:** As a user, I want to update or remove my API key, so that I can manage my credentials securely.

#### Acceptance Criteria

1. WHEN a user invokes the "Set OpenAI API Key" command and an API key already exists THEN the Extension SHALL inform the user that a key exists
2. WHEN an existing API key is present THEN the Extension SHALL offer options to update or remove the key
3. WHEN a user chooses to update the key THEN the Extension SHALL display the password-protected input box
4. WHEN a user chooses to remove the key THEN the Extension SHALL delete the key from all storage locations
5. WHEN a key is removed THEN the Extension SHALL display a confirmation message

### Requirement 4

**User Story:** As a developer, I want the API key input to follow VS Code best practices, so that the extension provides a consistent and secure user experience.

#### Acceptance Criteria

1. THE Extension SHALL use the password parameter in showInputBox for API key input
2. THE Extension SHALL provide clear placeholder text indicating the expected key format
3. THE Extension SHALL provide helpful prompt text explaining what the user should enter
4. WHEN displaying error messages THEN the Extension SHALL NOT include the actual API key in the message
5. THE Extension SHALL use internationalized strings for all user-facing messages
