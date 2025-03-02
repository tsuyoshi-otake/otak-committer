# Change Log

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