# Change Log

## [2.4.2] - 2026-02-17

### Added

- **Settings Sync integration:**
  - Added `otakCommitter.syncApiKeys` to optionally sync API keys via VS Code Settings Sync (synced extension state)
  - Synced the `alwaysStageAll` preference across devices (extension globalState)
  - Storage diagnostics now report "Settings Sync" as a key location when present

## [2.4.1] - 2026-02-17

### Improved

- **Developer experience:**
  - Added Prettier formatting and EditorConfig
  - Added ESLint CI mode (`lint:ci`) and GitHub Actions CI workflow

- **Maintainability:**
  - Refactored extension activation lifecycle via `ExtensionApp`
  - Removed stray `console` usage; improved `Logger` error sanitization

- **Type safety:**
  - Replaced remaining `any` in error contexts with `unknown`
  - Removed deprecated `PromptType` imports and tightened prompt map types

## [2.4.0] - 2026-02-17

### Added

- **Commit message trailer:**
  - Generated commit messages now include `Commit-Message-By: otak-committer` trailer
  - Configurable via `otakCommitter.appendCommitTrailer` setting (default: enabled)

### Refactored

- **Code duplication elimination:**
  - Consolidated duplicate `openExternalUrl()` and `initializeOpenAI()` into `BaseCommand`
  - Removed 5 duplicate preview methods (~90 lines) from `IssueCommand`, now shared via `utils/preview`
  - Unified token constants (`MAX_INPUT_TOKENS`, `CHARS_PER_TOKEN`) into `constants/tokenLimits.ts`
  - Removed duplicate `isWindowsReservedName()` from `GitService`, imported from `diffUtils`

- **God Object splitting (SRP):**
  - Decomposed `getDiff()` (144 lines) into focused orchestrator + 5 extracted methods
  - Split `StorageManager` (603 lines) into `StorageManager` + `StorageMigrationService` + `StorageDiagnostics`
  - Extracted `ApiKeyValidator` from `ApiKeyManager` for validation logic

- **Error handling unification:**
  - Renamed `BaseService.handleError()` to `handleErrorAndRethrow()` (return type `never`)
  - Renamed `BaseCommand.handleError()` to `handleErrorSilently()` (return type `void`)
  - Simplified `ErrorHandler.determineSeverity()` via polymorphic `severity` property on `BaseError`

- **Complex condition flattening:**
  - Simplified `generateAndCreateIssue()` loop by extracting `runIssueGenerationLoop()`

- **Type safety improvements:**
  - Replaced `any` types with proper types (`GitExtensionAPI`, `PullRequestDiff`, `TemplateInfo`, `unknown`)
  - Created `ServiceProvider` type for type-safe service identifiers
  - Added named constants for magic numbers (`MAX_VALIDATION_RETRIES`, `GITHUB_PAGE_SIZE`, etc.)

### Improved (Round 2 - Quality Hardening)

- **Type safety improvements:**
  - Changed `any[]` to `unknown[]` in `BaseCommand.execute()` and `CommandRegistry` handler signatures
  - Fixed unsafe `as Error` casts in `StorageManager.deleteApiKey()` to use `unknown[]`
  - Extracted `isNoCommitsBetweenBranchesError()` type guard in `GitHubService`, replacing unsafe `as` cast

- **Method splitting and complexity reduction:**
  - Split `analyzeFiles()` (79 lines) in `IssueGeneratorService` into `analyzeFiles()` + `analyzeOneFile()` + `isFileOversized()`
  - Made `FILE_TYPE_MAP` a static class property instead of recreated per call
  - Unified token estimation in `generatePreview()` to use `TokenManager.estimateTokens()`

- **Security hardening:**
  - Added template file size limit (100 KB) in `GitService.tryReadFirstTemplate()`
  - Added `PromptService.sanitizeTemplateContent()` (10,000 char limit) for commit and PR templates
  - Added 30-second timeout with `AbortController` to API key validation in `ApiKeyValidator`
  - Changed `SecretStorageProvider.set()` and `delete()` from `Promise.all()` to sequential execution for consistency
  - Added `index.lock` retry with 1-second delay in `GitService.stageFiles()`

### Security

- **Logger sensitive field redaction:**
  - Added automatic redaction of `apikey`, `token`, `secret`, `password` fields in log output
  - Error objects now logged as `name` + `message` only (no stack traces in output channel)

- **BaseError context sanitization:**
  - Error context objects now automatically redact sensitive fields in `toString()`

- **OpenAI response validation:**
  - Added structural validation of API response (`choices` array, `content` type check)

- **Configuration injection mitigation:**
  - Added 500-character length limit on `customMessage` workspace setting before prompt injection

- **SecretStorageProvider logging unified:**
  - Replaced `console.log`/`console.error` with `Logger` (redaction applies automatically)

- **TOCTOU fix in preview:**
  - Removed `stat()` check before `delete()` to eliminate race condition

- **ReDoS mitigation:**
  - Replaced regex-based `containsDangerousPatterns()` with simple `indexOf` checks

- **Dependency vulnerabilities patched:**
  - Updated `glob`, `diff`, `js-yaml` to fix known CVEs (0 vulnerabilities remaining)

## [2.2.0] - 2026-02-16

### Added

- **UI localization expanded:**
  - Added Vietnamese (vi), Korean (ko), Simplified Chinese (zh-cn), and Traditional Chinese (zh-tw) UI translations
  - Locale detection now maps common Chinese variants (zh-Hant/zh-HK/zh-MO) to Traditional Chinese UI

## [2.1.2] - 2025-12-12

### Changed

- **Upgraded AI model to GPT-5.2:**
  - Commit/PR/Issue generation now uses `gpt-5.2`
  - Requests updated for GPT-5.2 chat completions (`max_completion_tokens`, `reasoning_effort`, `store: false`)
  - System guidance is now sent as a `developer` message
  - Temperature is omitted because GPT-5.2 only supports the default value

## [2.1.1] - 2025-12-09

### Fixed

- **Scope hint now included in format instruction:**
  - Changed from optional suggestion to direct format inclusion
  - AI now receives `<prefix>(scope): <subject>` format when scope is detected
  - Improved consistency in commit message scope usage

### Changed

- **Default for useConventionalCommits set to false:**
  - Traditional format remains default for backward compatibility
  - Users can opt-in to strict Conventional Commits format

## [2.1.0] - 2025-12-09

### Fixed

- **Windows reserved filename handling:**
  - Fixed `error: invalid path 'nul'` when files with Windows reserved names (nul, con, aux, etc.) exist in the repository
  - Reserved name files are now skipped during `git add` instead of causing errors
  - File names are still included in diff output as comments for AI processing

- **Git index.lock error handling:**
  - Added detection and user-friendly error message for `index.lock` errors
  - Users now see: "Git is busy. Please wait for other Git operations to complete, or delete .git/index.lock if the problem persists."

- **Status bar button not clickable after fresh install:**
  - Fixed "Set API Key" button in status bar tooltip being unresponsive on first install
  - Corrected command registration order: commands are now registered before status bar initialization
  - Tooltip command links now work immediately after extension activation

## [2.0.5] - 2025-12-07

### Fixed

- **Language setting now properly respected:**
  - Commit messages are now generated in the language selected via status bar
  - Uses `otakCommitter.language` setting instead of UI locale
  - Language-specific system prompts are correctly applied

- **Reverted to GPT-4.1 model:**
  - Restored stable GPT-4.1 API implementation
  - Simplified OpenAI service to use standard chat completions format
  - Resolves "An unexpected error occurred" issue

- **API key validation pattern relaxed:**
  - Changed validation from `/^sk-[a-zA-Z0-9]{40,}$/` to `/^sk-.+$/`
  - Now accepts test keys, project keys (`sk-proj-`), and shorter valid keys
  - Resolves issue where some legitimate OpenAI API keys were incorrectly rejected
  - Maintains basic format validation (requires "sk-" prefix with at least one character)

## [2.0.0] - 2025-12-07

### Major Changes

- **Migrated from GPT-4.1 to GPT-5.1:**
  - Updated all AI operations to use OpenAI's GPT-5.1 model
  - Switched from Chat Completions API to Responses API
  - Improved response quality with configurable reasoning effort

### Added

- **Reasoning effort configuration:**
  - New `otakCommitter.reasoningEffort` setting (none/low/medium/high)
  - Default setting: "low" for optimal balance of speed and quality
  - Higher settings provide more thorough analysis at the cost of latency

- **Unified 200K token limit:**
  - All features now support up to 200,000 input tokens
  - Previously: 200K for commits, 100K for issues/PRs
  - Enables processing of larger diffs and file sets

- **New configuration options:**
  - `otakCommitter.maxInputTokens`: Configure maximum input tokens (default: 200,000)
  - Advanced users can adjust based on their needs

### Changed

- **Token management improvements:**
  - Unified token limit across commit messages, pull requests, and issues
  - Automatic truncation with user-friendly warning messages
  - Better token estimation for multi-byte characters

- **Error handling enhancements:**
  - Improved error classification for GPT-5.1 specific errors
  - User-friendly error messages without technical details
  - Better guidance for rate limits, authentication, and network errors

- **Output token allocations:**
  - Commit messages: 2,000 tokens (optimized for quality)
  - PR titles: 200 tokens
  - PR bodies: 4,000 tokens
  - Issues: 8,000 tokens

### Migration Notes

- Existing settings (language, emoji, custom message) are preserved
- API keys continue to work without reconfiguration
- No breaking changes to user-facing functionality

## [1.8.6] - 2025-09-20

### Fixed

- **Migration notification shown only once:**
  - API key migration notification now appears only on first migration
  - Added persistent flag to track notification display status
  - Prevents repetitive notifications on every VS Code restart

### Documentation

- **Enhanced README with security information:**
  - Added comprehensive Security & Privacy section
  - Documented single-maintainer security benefits
  - Improved English for US developer audience
  - Removed decorative emojis for professional appearance

## [1.8.5] - 2025-09-19

### Security

- **Enhanced backup encryption:**
  - GlobalState backup now uses AES-256-GCM encryption
  - Machine-specific key generation using hostname, platform, and user info
  - Automatic decryption when recovering from backup
  - Added encryption self-test in diagnostics

### Changed

- **Improved security for API key backup:**
  - Backup storage is now encrypted instead of plaintext
  - Uses PBKDF2 for key derivation with 100,000 iterations
  - Random salt and IV for each encryption operation

## [1.8.4] - 2025-09-19

### Fixed

- **API key persistence issues in WSL/Remote environments:**
  - Added redundant storage using both SecretStorage and GlobalState
  - Implemented automatic fallback when SecretStorage fails
  - Added recovery mechanism to restore lost keys from backup
  - Improved error handling during storage operations

### Added

- **Storage diagnostics command:**
  - New command `Diagnose API Key Storage` to troubleshoot storage issues
  - Shows detailed information about API key location and status
  - Helps identify WSL and Remote Development environment issues
  - Accessible via Command Palette

### Changed

- **Enhanced logging:**
  - Added detailed environment logging during initialization
  - Improved error messages for storage operations
  - Better visibility into API key retrieval process

## [1.8.3] - 2025-09-19

### Fixed

- **File path handling with spaces and special characters:**
  - Fixed commit message generation failure for files with spaces in paths
  - Improved handling of deleted files in git operations
  - Files are now added individually to avoid path parsing issues
  - Added proper error handling for deleted file scenarios

## [1.8.2] - 2025-09-18

### Security

- **Removed deprecated API key setting:**
  - Completely removed `otakCommitter.openaiApiKey` from package.json
  - Setting no longer appears in VS Code settings UI
  - API keys now exclusively stored in SecretStorage

### Changed

- Users must now use the prompt dialog to set API keys (no manual configuration option)

## [1.8.1] - 2025-09-18

### Security

- **Enhanced API key migration:**
  - Added forceClearDeprecatedSettings method to ensure complete removal of API keys from settings
  - Clear API keys from all configuration scopes (Global, Workspace, WorkspaceFolder)
  - Improved security by forcing clearance of deprecated settings on every startup

### Fixed

- **Package vulnerabilities:**
  - Updated all vulnerable dependencies to latest secure versions
  - Fixed axios SSRF and DoS vulnerabilities
  - Fixed form-data critical vulnerability
  - Updated esbuild to resolve security issue
  - Fixed eslint and brace-expansion vulnerabilities

## [1.8.0] - 2025-09-18

### Added

- **CLAUDE.md documentation file:**
  - Added comprehensive development guide for Claude Code instances
  - Documented service architecture and key implementation patterns
  - Included common development commands and tasks

### Security

- **Secure API key storage:**
  - Migrated OpenAI API key storage to VS Code's SecretStorage API
  - Enhanced security by removing plain text storage options
  - Improved API key validation and error handling

### Changed

- **Enhanced commit message sanitization:**
  - Added utility function to sanitize commit messages
  - Prevents command injection vulnerabilities
  - Improved handling of special characters

## [1.7.1] - 2025-04-27

### Changed

- Modified Git diff handling for commit message generation: Diffs exceeding 200K tokens will now be truncated to the first ~200K tokens, and a warning message will be displayed. This prevents errors with very large diffs while still allowing AI processing.

## [1.7.0] - 2025-04-27

### Added

- **Support for GPT-4.1:**
  - Integrated the latest GPT-4.1 model for enhanced AI capabilities in commit message, issue, and PR generation.
  - Updated OpenAI service to utilize the new model endpoints and features.

## [1.6.1] - 2025-03-02

### Changed

- **Improved error message handling:**
  - Standardized notification display times to 3 seconds
  - Unified error message format for better consistency
  - Added progress indicators for ongoing operations
  - Improved visual feedback for error states

## [1.6.0] - 2025-03-02

### Changed

- **Switched to VS Code's built-in GitHub authentication:**
  - Removed custom GitHub token configuration.
  - Removed GitHub App authentication.
  - Simplified authentication flow using VS Code's native GitHub integration.
  - Unified authentication notifications in both Issue and PR commands with English messages.
  - Improved user experience with automatic token management and user-friendly prompts.
  - Enhanced error handling with clearer messages.
- **Updated README.md:**
  - Added a "GitHub Authentication" section outlining that the extension now uses VS Code’s built-in authentication by default, with sign-in/sign-out managed via VS Code.

## [1.5.3] - 2025-03-02

### Added

- Added GitHub App authentication support
  - New configuration options for GitHub App authentication (appId, privateKey, installationId)
  - Automatic selection between token and GitHub App authentication
  - Improved error handling and user guidance for authentication setup

## [1.5.2] - 2025-02-28

### Added

- Enhanced commit message generation to support untracked files
- Improved file status detection for better coverage of Git changes

## [1.5.1] - 2025-02-28

### Changed

- Implemented 100K token limit for all content generation
  - Applied to commits, issues, and pull requests
  - Added content truncation with appropriate warnings

## [1.5.0] - 2025-02-26

### Added

- Added new Issue generation feature
  - Generate GitHub Issues with AI assistance
  - Supports file analysis for issue content
  - Integrated with GitHub API for direct issue creation
  - Emoji support controlled by useEmoji setting
  - Custom message support for content generation
- Added emoji support for all AI-generated content
  - New `useEmoji` setting to toggle emoji usage globally
  - New `emojiStyle` setting to choose between GitHub-style (:smile:) or Unicode (😊) emojis
  - Applied to commit messages, PRs, and Issues

### Changed

- Major code refactoring for improved maintainability
  - Reorganized service layer architecture
  - Enhanced type safety across the codebase
  - Optimized API integration modules
  - Extended customMessage support to all content generation (commits, Issues, and PRs)

## [1.4.2] - 2025-02-26

### Changed

- Improved the language selection menu UI
  - Now displays using native language names
  - Changed to a simple two-column layout

## [1.4.1] - 2025-02-25

### Changed

- Refactored the entire codebase
- Improved error handling
- Strengthened TypeScript type definitions
