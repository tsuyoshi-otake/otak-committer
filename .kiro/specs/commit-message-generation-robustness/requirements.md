# Requirements Document

## Introduction

This feature addresses issues with commit message generation when dealing with large file counts, extensive changes, or special characters. The current implementation has several limitations that can cause generation failures or produce incorrect results.

## Glossary

- **System**: The commit message generation functionality within the VS Code extension
- **Diff**: The Git diff output showing changes between commits
- **Token**: A unit of text processed by the AI model (approximately 4 characters)
- **Reserved Name**: Windows reserved device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
- **Special Character**: Non-ASCII characters, control characters, or characters with special meaning in shells
- **Staged Changes**: Files that have been added to Git's staging area for commit

## Requirements

### Requirement 1

**User Story:** As a developer, I want to generate commit messages for large changesets, so that I can commit extensive refactoring or feature work without manual message writing.

#### Acceptance Criteria

1. WHEN the staged changes exceed 200K tokens THEN the System SHALL truncate the diff intelligently while preserving file context
2. WHEN the staged changes include more than 50 files THEN the System SHALL summarize file changes by category before generating the commit message
3. WHEN the diff is truncated THEN the System SHALL notify the user with the original and truncated token counts
4. WHEN generating a message for truncated diffs THEN the System SHALL include a note indicating the changeset was large
5. WHEN the staged changes are within normal limits THEN the System SHALL process them without truncation or summarization

### Requirement 2

**User Story:** As a developer working on Windows, I want to commit files with reserved names, so that I can work with legacy codebases or special configuration files.

#### Acceptance Criteria

1. WHEN a staged file has a Windows reserved name THEN the System SHALL include the filename in the diff summary
2. WHEN a reserved name file is detected THEN the System SHALL log a warning with the filename
3. WHEN generating a commit message with reserved name files THEN the System SHALL mention these files in the message
4. WHEN multiple reserved name files are present THEN the System SHALL list all of them in the notification
5. WHEN no reserved name files are present THEN the System SHALL process files normally without additional checks

### Requirement 3

**User Story:** As a developer working with international codebases, I want commit messages to handle special characters correctly, so that my commit history remains readable and valid.

#### Acceptance Criteria

1. WHEN the generated message contains Unicode characters THEN the System SHALL preserve them without corruption
2. WHEN the generated message contains shell metacharacters THEN the System SHALL escape them to prevent command injection
3. WHEN the generated message contains markdown code blocks THEN the System SHALL remove the code block markers
4. WHEN the generated message contains smart quotes or typographic characters THEN the System SHALL normalize them to ASCII equivalents
5. WHEN the generated message contains control characters THEN the System SHALL remove them except for newlines and tabs

### Requirement 4

**User Story:** As a developer, I want clear error messages when commit generation fails, so that I can understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN the diff retrieval fails THEN the System SHALL display an error message with the failure reason
2. WHEN the AI API call fails THEN the System SHALL display an error message with the API error details
3. WHEN the API key is invalid THEN the System SHALL prompt the user to reconfigure the API key
4. WHEN the diff is empty THEN the System SHALL notify the user that there are no changes to commit
5. WHEN an unexpected error occurs THEN the System SHALL log the full error details for debugging

### Requirement 5

**User Story:** As a developer, I want the system to handle edge cases gracefully, so that commit message generation works reliably in all scenarios.

#### Acceptance Criteria

1. WHEN the diff contains only whitespace changes THEN the System SHALL generate a message describing the formatting changes
2. WHEN the diff contains binary file changes THEN the System SHALL mention the binary files in the commit message
3. WHEN the diff contains file deletions only THEN the System SHALL generate a message describing the removed files
4. WHEN the diff contains file renames THEN the System SHALL generate a message describing the renamed files
5. WHEN the diff contains mixed operations THEN the System SHALL generate a message summarizing all operation types
