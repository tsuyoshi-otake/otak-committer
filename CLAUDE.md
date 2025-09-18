# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

otak-committer is a VS Code extension that uses AI (GPT-4.1) to generate Git commit messages, pull requests, and GitHub issues. It supports 25 languages and integrates with VS Code's SCM interface.

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript (type checking only)
npm run compile

# Development build with source maps
npm run esbuild

# Watch mode for development
npm run watch

# Run linting
npm run lint

# Run tests
npm run test

# Production build (minified)
npm run vscode:prepublish

# Package the extension
vsce package
```

## Architecture

### Service-Based Architecture
The codebase uses a service-oriented pattern with abstract base classes:

- **BaseService** (src/services/base.ts): Abstract base providing configuration management, error handling, and factory pattern
- **OpenAIService**: Handles all AI interactions with GPT-4.1, manages prompts and responses
- **GitService**: Git operations, diff analysis, staging, template discovery
- **GitHubService**: GitHub API integration for PRs and issues
- **PromptService**: Centralized prompt engineering for different languages and styles

Services are instantiated through factories and use dependency injection patterns.

### Language Support System
25 languages are supported through individual modules in src/languages/:
- Each language has its own prompt engineering
- Languages are grouped regionally (European, Asian, Middle Eastern)
- RTL support for Arabic and Hebrew

### Security Considerations
- API keys stored using VS Code's SecretStorage API (never in plain text)
- Commit messages sanitized with sanitizeCommitMessage() utility
- Large diffs truncated at 200K tokens to prevent token overflow

## Key Implementation Details

### Adding New Features
1. Commands go in src/commands/ and must be registered in extension.ts
2. Services inherit from BaseService and implement dispose()
3. Language support requires new module in src/languages/ and registration in constants

### Testing Approach
- Tests use Mocha framework with VS Code Extension Host
- Test files must end with .test.js
- Run individual tests by modifying the glob pattern in src/test/suite/index.ts

### Configuration Schema
Extension settings are defined in package.json under contributes.configuration. Main settings:
- `otak-committer.language`: Language selection
- `otak-committer.messageStyle`: simple/normal/detailed
- `otak-committer.useEmoji`: Enable/disable emoji support

### Build Process
The extension uses esbuild for bundling:
- Development builds include source maps
- Production builds are minified
- Output goes to out/ directory
- Entry point is src/extension.ts

## Common Tasks

### Update Version
1. Update version in package.json
2. Update CHANGELOG.md with new version details
3. Run `vsce package` to create .vsix file

### Add New Language Support
1. Create language module in src/languages/
2. Add to SUPPORTED_LANGUAGES in src/constants/languages.ts
3. Implement getPrompt() and getCommitGuide() functions
4. Test with different diff scenarios

### Modify AI Behavior
- Prompts are centralized in PromptService
- Model selection in OpenAIService (currently GPT-4.1)
- Token limits defined in services/openai.ts