# Requirements Document

## Introduction

This specification addresses the migration from GPT-4.1 to GPT-5.1 using the Responses API, and the unification of token limits across all AI-powered features in the Otak Committer extension. Currently, the system uses GPT-4.1 with Chat Completions API and has inconsistent token limits (200K for commit messages, 100K for issues/PRs). This migration will leverage GPT-5.1's capabilities with the Responses API to provide consistent 200K token input handling across all features.

## Glossary

- **Responses API**: OpenAI's API endpoint optimized for long-form input processing and structured output generation
- **Chat Completions API**: OpenAI's traditional conversational API endpoint
- **Token Limit**: The maximum number of tokens (approximately 4 characters per token) that can be processed in a single API request
- **GPT-5.1**: OpenAI's latest model with 400K context window and 128K max output tokens
- **Reasoning Effort**: GPT-5.1's configurable reasoning parameter (none/low/medium/high) that affects response quality and latency
- **Commit Message Generation**: Feature that analyzes Git diffs and generates commit messages
- **Issue Generation**: Feature that analyzes repository files and generates GitHub issues
- **Pull Request Generation**: Feature that analyzes branch diffs and generates PR content

## Requirements

### Requirement 1

**User Story:** As a developer, I want to use GPT-5.1 with Responses API for all AI features, so that I can benefit from the latest model capabilities and consistent API behavior.

#### Acceptance Criteria

1. WHEN the system generates commit messages THEN the system SHALL use GPT-5.1 model via Responses API
2. WHEN the system generates pull requests THEN the system SHALL use GPT-5.1 model via Responses API
3. WHEN the system generates issues THEN the system SHALL use GPT-5.1 model via Responses API
4. WHEN making API requests THEN the system SHALL use the `/v1/responses` endpoint instead of `/v1/chat/completions`
5. WHEN the system initializes THEN the system SHALL validate that the OpenAI API key supports GPT-5.1 access

### Requirement 2

**User Story:** As a developer, I want consistent 200K token input limits across all features, so that I can process large diffs and file sets without arbitrary restrictions.

#### Acceptance Criteria

1. WHEN processing commit message diffs THEN the system SHALL support up to 200,000 tokens of input
2. WHEN processing pull request diffs THEN the system SHALL support up to 200,000 tokens of input
3. WHEN processing issue generation files THEN the system SHALL support up to 200,000 tokens of input
4. WHEN input exceeds 200,000 tokens THEN the system SHALL truncate the input and display a warning message
5. WHEN calculating token counts THEN the system SHALL use 4 characters per token as the estimation ratio

### Requirement 3

**User Story:** As a developer, I want the system to use appropriate reasoning effort settings, so that I get fast responses for simple tasks and thorough analysis for complex tasks.

#### Acceptance Criteria

1. WHEN generating commit messages THEN the system SHALL use reasoning effort "low" for fast response
2. WHEN generating pull request content THEN the system SHALL use reasoning effort "low" for balanced performance
3. WHEN generating GitHub issues THEN the system SHALL use reasoning effort "low" for consistent behavior
4. WHEN the API request includes reasoning settings THEN the system SHALL include the `reasoning` parameter with the `effort` field
5. THE reasoning effort setting SHALL be configurable through VS Code settings for advanced users

### Requirement 4

**User Story:** As a developer, I want proper error handling for Responses API calls, so that I receive clear feedback when API requests fail.

#### Acceptance Criteria

1. WHEN a Responses API call fails THEN the system SHALL log the error with full context
2. WHEN a Responses API call fails THEN the system SHALL display a user-friendly error message
3. WHEN the API returns a rate limit error THEN the system SHALL inform the user about rate limiting
4. WHEN the API returns an invalid model error THEN the system SHALL suggest checking API key permissions
5. WHEN network errors occur THEN the system SHALL provide retry guidance to the user

### Requirement 5

**User Story:** As a developer, I want the migration to maintain backward compatibility with existing configurations, so that my current settings continue to work without manual intervention.

#### Acceptance Criteria

1. WHEN the system starts THEN the system SHALL read existing OpenAI API key from secure storage
2. WHEN existing temperature settings exist THEN the system SHALL apply them to Responses API calls
3. WHEN existing language preferences exist THEN the system SHALL apply them to prompt generation
4. WHEN existing emoji preferences exist THEN the system SHALL apply them to content generation
5. WHEN existing custom message settings exist THEN the system SHALL include them in prompts

### Requirement 6

**User Story:** As a developer, I want optimized output token allocation, so that the system can generate complete responses without truncation.

#### Acceptance Criteria

1. WHEN generating commit messages THEN the system SHALL allocate up to 2,000 output tokens
2. WHEN generating pull request titles THEN the system SHALL allocate up to 200 output tokens
3. WHEN generating pull request bodies THEN the system SHALL allocate up to 4,000 output tokens
4. WHEN generating GitHub issues THEN the system SHALL allocate up to 8,000 output tokens
5. THE output token allocation SHALL ensure that input tokens plus output tokens plus reasoning tokens do not exceed 400,000 tokens


