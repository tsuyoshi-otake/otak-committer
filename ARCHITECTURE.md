# otak-committer Architecture Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Layer Architecture](#layer-architecture)
4. [Component Responsibilities](#component-responsibilities)
5. [Data Flow](#data-flow)
6. [Type System](#type-system)
7. [Error Handling](#error-handling)
8. [Storage Architecture](#storage-architecture)
9. [Testing Strategy](#testing-strategy)
10. [Migration Guide for Contributors](#migration-guide-for-contributors)

## System Overview

otak-committer is a VS Code extension that uses AI to generate commit messages, pull requests, and GitHub issues. The extension has been refactored to follow clean architecture principles with clear separation of concerns.

### Key Features

- **AI-Powered Generation**: Uses OpenAI API to generate commit messages, PRs, and issues
- **Multi-Language Support**: Supports 20+ languages for generated content
- **Secure Storage**: API keys stored in VS Code's encrypted SecretStorage
- **Configurable**: Customizable message styles, emoji usage, and language preferences
- **Git Integration**: Deep integration with Git repositories and GitHub

### Technology Stack

- **Language**: TypeScript
- **Runtime**: VS Code Extension Host
- **APIs**: VS Code Extension API, OpenAI API, GitHub API
- **Testing**: Mocha, fast-check (property-based testing)
- **Build**: TypeScript Compiler, esbuild

## Architecture Principles

The architecture follows these core principles:

### 1. Single Responsibility Principle (SRP)

Each module has one clear responsibility. For example:

- `StorageManager` handles all persistence operations
- `ConfigManager` handles all configuration operations
- `ErrorHandler` handles all error processing

### 2. Dependency Inversion Principle (DIP)

High-level modules don't depend on low-level modules. Both depend on abstractions:

- Commands depend on `StorageProvider` interface, not concrete implementations
- Services depend on `Logger` interface, not specific logging implementations

### 3. Interface Segregation Principle (ISP)

Clients don't depend on interfaces they don't use:

- `StorageProvider` interface is minimal with only essential methods
- Commands only receive the context they need

### 4. Open/Closed Principle (OCP)

The system is open for extension but closed for modification:

- New commands can be added by extending `BaseCommand`
- New storage providers can be added by implementing `StorageProvider`

### 5. No Circular Dependencies

The dependency graph is acyclic, ensuring clean module boundaries and testability.

## Layer Architecture

The extension follows a layered architecture with clear boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│                     Entry Point Layer                        │
│                      (extension.ts)                          │
│  - Extension lifecycle management                            │
│  - Component initialization                                  │
│  - Command registration                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Command Layer                           │
│         (CommitCommand, PRCommand, IssueCommand)             │
│  - User interaction handling                                 │
│  - Progress notifications                                    │
│  - Command orchestration                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│      (GitService, OpenAIService, GitHubService)              │
│  - Business logic implementation                             │
│  - External API integration                                  │
│  - Data transformation                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│  (StorageManager, ConfigManager, ErrorHandler, Logger)       │
│  - Cross-cutting concerns                                    │
│  - Persistence management                                    │
│  - Error handling and logging                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Type System                             │
│              (Enums, Interfaces, Errors)                     │
│  - Type definitions                                          │
│  - Shared contracts                                          │
└─────────────────────────────────────────────────────────────┘
```

### Layer Dependencies

- **Entry Point** → Commands, Infrastructure
- **Commands** → Services, Infrastructure
- **Services** → Infrastructure
- **Infrastructure** → Types
- **Types** → (no dependencies)

**Rule**: Higher layers can depend on lower layers, but never the reverse.

## Component Responsibilities

### Entry Point Layer

#### extension.ts

**Responsibility**: Extension lifecycle management

**Key Functions**:

- Initialize infrastructure components (Logger, ErrorHandler, StorageManager, ConfigManager)
- Register commands with VS Code
- Set up StatusBar
- Handle activation and deactivation

**Size Constraint**: ≤ 50 lines (excluding imports and comments)

**Example**:

```typescript
export async function activate(context: vscode.ExtensionContext) {
  const logger = Logger.getInstance();
  const storage = new StorageManager(context);
  const config = new ConfigManager();

  // Register commands
  const registry = new CommandRegistry();
  registry.register(new CommitCommand(context));
  registry.register(new PRCommand(context));
  registry.registerAll(context);

  logger.info('Extension activated');
}
```

### Command Layer

#### BaseCommand (Abstract Class)

**Responsibility**: Provide common infrastructure to all commands

**Key Features**:

- Access to Logger, ConfigManager, StorageManager
- `withProgress()` helper for progress notifications
- `handleErrorSilently()` helper for consistent error handling (swallows errors)
- `initializeOpenAI()` helper for OpenAI service initialization
- `openExternalUrl()` helper for opening URLs in browser

**Usage**:

```typescript
export class CommitCommand extends BaseCommand {
  async execute() {
    try {
      await this.withProgress('Generating commit...', async () => {
        // Command logic
      });
    } catch (error) {
      this.handleErrorSilently(error, 'generate commit message');
    }
  }
}
```

#### CommitCommand

**Responsibility**: Generate AI-powered commit messages

**Dependencies**: GitService, OpenAIService, PromptService

**Flow**:

1. Get staged changes from GitService
2. Generate prompt from PromptService
3. Call OpenAI API via OpenAIService
4. Present message to user for confirmation
5. Commit if approved

#### PRCommand

**Responsibility**: Generate pull request descriptions

**Dependencies**: GitService, GitHubService, OpenAIService

**Flow**:

1. Get branch diff from GitService
2. Generate PR description via OpenAI
3. Create PR via GitHubService
4. Show success notification

#### IssueCommand

**Responsibility**: Generate GitHub issues

**Dependencies**: GitHubService, OpenAIService

**Flow**:

1. Get user input for issue context
2. Generate issue content via OpenAI
3. Create issue via GitHubService
4. Open issue in browser

#### ConfigCommand

**Responsibility**: Handle configuration changes

**Dependencies**: ConfigManager

**Operations**:

- Change language preference
- Change message style
- Update emoji settings

### Service Layer

#### GitService

**Responsibility**: Git repository operations

**Key Methods**:

- `getStagedChanges()`: Get diff of staged files
- `getBranchDiff()`: Get diff between branches
- `commit()`: Create a commit
- `getCurrentBranch()`: Get active branch name

**Dependencies**: simple-git library, Logger

#### OpenAIService

**Responsibility**: OpenAI API integration

**Key Methods**:

- `generateCompletion()`: Generate text completion
- `generateCommitMessage()`: Specialized commit message generation
- `generatePRDescription()`: Specialized PR description generation

**Dependencies**: OpenAI SDK, StorageManager (for API key), ConfigManager, Logger

**Error Handling**: Retries with exponential backoff, fallback to simpler models

#### GitHubService

**Responsibility**: GitHub API integration

**Key Methods**:

- `createPullRequest()`: Create a new PR
- `createIssue()`: Create a new issue
- `getRepository()`: Get repository information

**Dependencies**: Octokit, StorageManager (for token), Logger

#### PromptService

**Responsibility**: Generate prompts for AI models

**Key Methods**:

- `buildCommitPrompt()`: Build commit message prompt
- `buildPRPrompt()`: Build PR description prompt
- `buildIssuePrompt()`: Build issue prompt

**Dependencies**: ConfigManager (for language/style), Language templates

### Infrastructure Layer

#### StorageManager

**Responsibility**: Unified storage abstraction

**Key Features**:

- Secure API key storage in SecretStorage
- Encrypted backup in GlobalState
- Fallback mechanisms for storage failures

**Key Methods**:

- `getApiKey(service)`: Retrieve API key with fallback
- `setApiKey(service, value)`: Store API key securely

#### StorageMigrationService

**Responsibility**: Legacy data migration

**Key Methods**:

- `migrateFromLegacy()`: Migrate old data formats
- `migrateLegacyKey()`: Migrate a single legacy key

#### StorageDiagnostics

**Responsibility**: Storage health checks and diagnostics

**Key Methods**:

- `checkStorageHealth()`: Verify storage subsystems
- `getStorageDiagnostics()`: Get detailed diagnostic info

**Storage Hierarchy**:

1. Primary: VS Code SecretStorage (encrypted)
2. Backup: GlobalState with encryption
3. Legacy: Configuration (migrated away from)

#### ConfigManager

**Responsibility**: Configuration management

**Key Features**:

- Type-safe configuration access
- Default value handling
- Configuration target management (Global/Workspace)

**Key Methods**:

- `get<K>(key)`: Get configuration value
- `set<K>(key, value, target)`: Set configuration value
- `getAll()`: Get all configuration as object
- `setDefaults()`: Initialize default values

#### ErrorHandler

**Responsibility**: Centralized error handling

**Key Features**:

- Error severity determination
- User notifications based on severity
- Error logging integration
- Sensitive field redaction in log output

**Error Severities**:

- **Info**: Informational messages
- **Warning**: Non-critical issues
- **Error**: Operation failures
- **Critical**: System-level failures

**Key Methods**:

- `handle(error, context)`: Process and handle error
- `showUserNotification(severity, message)`: Notify user

**Note**: Error severity is determined polymorphically via `BaseError.severity` property, not a standalone method.

#### Logger

**Responsibility**: Unified logging interface

**Key Features**:

- Multiple log levels (Debug, Info, Warning, Error)
- Output channel integration
- Console logging for development
- Timestamp and level formatting

**Key Methods**:

- `debug(message, ...args)`: Debug-level logging
- `info(message, ...args)`: Info-level logging
- `warning(message, ...args)`: Warning-level logging
- `error(message, error)`: Error-level logging

**Singleton Pattern**: Use `Logger.getInstance()` to access

### UI Layer

#### StatusBarManager

**Responsibility**: Manage status bar UI

**Key Features**:

- Display current language and message style
- Quick access to configuration commands
- Visual feedback for extension state

## Data Flow

### Commit Message Generation Flow

```
User triggers command
        │
        ▼
┌───────────────────┐
│  CommitCommand    │
│  - Validate repo  │
│  - Show progress  │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   GitService      │
│  - Get staged     │
│    changes        │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  PromptService    │
│  - Build prompt   │
│  - Add context    │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  OpenAIService    │
│  - Get API key    │
│  - Call API       │
│  - Parse response │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  CommitCommand    │
│  - Show preview   │
│  - Get approval   │
│  - Commit         │
└───────────────────┘
        │
        ▼
User sees result
```

### Configuration Flow

```
User changes setting
        │
        ▼
┌───────────────────┐
│  ConfigCommand    │
│  - Validate input │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  ConfigManager    │
│  - Update config  │
│  - Persist        │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ StatusBarManager  │
│  - Update display │
└───────────────────┘
        │
        ▼
User sees updated status
```

### Storage Flow (API Key)

```
Command needs API key
        │
        ▼
┌───────────────────────┐
│   StorageManager      │
│   - Check SecretStore │
└───────────────────────┘
        │
        ├─ Found ──────────────┐
        │                      │
        └─ Not Found           │
           │                   │
           ▼                   │
┌───────────────────────┐     │
│   StorageManager      │     │
│   - Check backup      │     │
└───────────────────────┘     │
        │                      │
        ├─ Found ──────────────┤
        │                      │
        └─ Not Found           │
           │                   │
           ▼                   │
┌───────────────────────┐     │
│   StorageManager      │     │
│   - Prompt user       │     │
│   - Store securely    │     │
└───────────────────────┘     │
        │                      │
        └──────────────────────┘
                │
                ▼
        Return API key
```

### Error Handling Flow

```
Error occurs in any component
        │
        ▼
┌───────────────────────┐
│   Component           │
│   - Catch error       │
│   - Add context       │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│   ErrorHandler        │
│   - Determine severity│
│   - Format message    │
└───────────────────────┘
        │
        ├────────────────┬────────────────┐
        ▼                ▼                ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Logger  │    │ VS Code  │    │  Redact  │
│  - Log   │    │ - Notify │    │ - Filter │
└──────────┘    └──────────┘    └──────────┘
```

## Type System

### Organization

```
src/types/
├── index.ts              # Central export point
├── enums/
│   ├── index.ts
│   ├── MessageStyle.ts   # Message style options
│   ├── SupportedLanguage.ts  # Language options
│   ├── GitStatus.ts      # Git file status
│   ├── IssueType.ts      # GitHub issue types
│   ├── PromptType.ts     # Prompt template types
│   ├── ReasoningEffort.ts # OpenAI reasoning effort levels
│   └── ServiceProvider.ts # Service provider identifiers (openai, github)
├── interfaces/
│   ├── index.ts
│   ├── Config.ts         # Configuration interfaces
│   ├── Storage.ts        # Storage interfaces
│   ├── Git.ts            # Git operation interfaces
│   ├── GitHub.ts         # GitHub API interfaces
│   ├── Issue.ts          # Issue interfaces
│   └── Common.ts         # Shared interfaces
└── errors/
    ├── index.ts
    ├── BaseError.ts      # Base error class
    ├── ValidationError.ts
    ├── ServiceError.ts
    ├── StorageError.ts
    ├── CommandError.ts
    └── CriticalError.ts
```

### Type Import Strategy

Always import from the central export:

```typescript
// ✅ Good
import { MessageStyle, SupportedLanguage } from '../types';

// ❌ Bad
import { MessageStyle } from '../types/enums/MessageStyle';
```

### Error Hierarchy

```
BaseError (abstract)
│   severity: ErrorSeverity  (polymorphic - each subclass defines its severity)
├── ValidationError      # Input validation failures (Warning)
├── ServiceError         # External service failures (Error)
│   ├── OpenAIServiceError
│   ├── GitHubServiceError
│   └── GitServiceError
├── StorageError         # Storage operation failures (Error)
├── CommandError         # Command execution failures (Error)
└── CriticalError        # System-level failures (Critical)
```

## Error Handling

### Error Handling Strategy

1. **Catch at Boundaries**: Errors are caught at command boundaries
2. **Transform and Enrich**: Add context information to errors
3. **Centralized Handling**: Route through ErrorHandler
4. **User Notification**: Notify users appropriately
5. **Logging**: Log all errors for debugging
6. **Graceful Degradation**: Provide fallback behavior when possible

### Error Context

Every error should include context:

```typescript
try {
  await operation();
} catch (error) {
  ErrorHandler.handle(error, {
    operation: 'generate commit message',
    component: 'CommitCommand',
    metadata: { repo: repoPath },
  });
}
```

### Fallback Mechanisms

| Operation         | Primary          | Fallback 1            | Fallback 2      |
| ----------------- | ---------------- | --------------------- | --------------- |
| API Key Retrieval | SecretStorage    | Encrypted GlobalState | Prompt User     |
| Configuration     | Workspace Config | Global Config         | Default Values  |
| Git Operations    | simple-git       | VS Code Git API       | Manual Input    |
| OpenAI API        | gpt-5.2          | Error message         | Cached Response |

## Storage Architecture

### Storage Layers

```
┌─────────────────────────────────────────┐
│         StorageManager API              │
│  (Unified interface for all storage)    │
└─────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│SecretStorage │  │Configuration │
│  Provider    │  │  Provider    │
└──────────────┘  └──────────────┘
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│  VS Code     │  │  VS Code     │
│SecretStorage │  │Configuration │
│  (encrypted) │  │    API       │
└──────────────┘  └──────────────┘
```

### Storage Provider Interface

```typescript
export interface StorageProvider {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}
```

### Migration Strategy

The extension automatically migrates from legacy storage:

1. **Detection**: Check for data in old Configuration storage
2. **Migration**: Copy to new SecretStorage
3. **Verification**: Confirm successful migration
4. **Cleanup**: Remove from old storage
5. **Flag**: Mark migration as complete

### Security Considerations

- **API Keys**: Always stored in SecretStorage (encrypted by VS Code)
- **Backup**: Encrypted backup in GlobalState using AES-256
- **Never**: Store sensitive data in plain-text Configuration
- **Cleanup**: Remove sensitive data from legacy storage after migration

## Testing Strategy

### Dual Testing Approach

The extension uses both unit tests and property-based tests:

#### Unit Tests

- Test specific examples and edge cases
- Test integration points between components
- Test error handling scenarios
- Located in `__tests__` folders next to source files

#### Property-Based Tests

- Test universal properties across all inputs
- Use `fast-check` library
- Run 100+ iterations per property
- Located in `src/__tests__/properties/`

### Test Organization

```
src/
├── commands/
│   ├── __tests__/
│   │   ├── BaseCommand.test.ts
│   │   ├── CommitCommand.test.ts
│   │   └── CommandRegistry.test.ts
│   └── ...
├── infrastructure/
│   ├── storage/
│   │   ├── __tests__/
│   │   │   ├── StorageManager.test.ts
│   │   │   └── StorageManager.fallback.test.ts
│   │   └── ...
│   └── ...
└── __tests__/
    ├── properties/
    │   ├── dependencies.property.test.ts
    │   ├── storage.property.test.ts
    │   └── architecture.property.test.ts
    └── integration/
        └── extension.integration.test.ts
```

### Property Test Examples

Each property test validates a correctness property from the design document:

```typescript
// **Feature: extension-architecture-refactoring, Property 1: No Circular Dependencies**
test('module dependency graph should be acyclic', () => {
  const modules = analyzeModuleDependencies('./src');
  const cycles = findCycles(modules);
  expect(cycles).toHaveLength(0);
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run only unit tests
npm test -- --testPathPattern="__tests__"

# Run only property tests
npm test -- --testPathPattern="properties"
```

## Migration Guide for Contributors

### Adding a New Command

1. **Create Command Class**:

```typescript
// src/commands/MyCommand.ts
import { BaseCommand } from './BaseCommand';

export class MyCommand extends BaseCommand {
  async execute(...args: unknown[]): Promise<void> {
    try {
      await this.withProgress('Doing something...', async () => {
        // Your logic here
        const config = this.config.get('someKey');
        const apiKey = await this.storage.getApiKey('openai');

        // Use services
        const result = await someService.doSomething();

        this.logger.info('Command completed');
      });
    } catch (error) {
      this.handleErrorSilently(error, 'my operation');
    }
  }
}
```

2. **Register Command**:

```typescript
// src/commands/index.ts
export { MyCommand } from './MyCommand';

// src/extension.ts
import { MyCommand } from './commands';

const registry = new CommandRegistry();
registry.register(new MyCommand(context));
```

3. **Add to package.json**:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "otak-committer.myCommand",
        "title": "My Command",
        "category": "Otak Committer"
      }
    ]
  }
}
```

4. **Write Tests**:

```typescript
// src/commands/__tests__/MyCommand.test.ts
describe('MyCommand', () => {
  it('should execute successfully', async () => {
    const command = new MyCommand(mockContext);
    await command.execute();
    // Assertions
  });
});
```

### Adding a New Service

1. **Create Service Class**:

```typescript
// src/services/myService.ts
import { Logger } from '../infrastructure/logging';

export class MyService {
  private logger = Logger.getInstance();

  async doSomething(): Promise<Result> {
    this.logger.info('Starting operation');

    try {
      // Service logic
      return result;
    } catch (error) {
      this.logger.error('Operation failed', error);
      throw new ServiceError('Operation failed', 'MyService');
    }
  }
}
```

2. **Export from index**:

```typescript
// src/services/index.ts
export { MyService } from './myService';
```

3. **Use in Commands**:

```typescript
import { MyService } from '../services';

const service = new MyService();
const result = await service.doSomething();
```

### Adding a New Configuration Option

1. **Update Type Definition**:

```typescript
// src/types/interfaces/Config.ts
export interface ExtensionConfig {
  // ... existing options
  myNewOption: string;
}
```

2. **Add to package.json**:

```json
{
  "configuration": {
    "properties": {
      "otakCommitter.myNewOption": {
        "type": "string",
        "default": "defaultValue",
        "description": "Description of my option"
      }
    }
  }
}
```

3. **Use in Code**:

```typescript
const value = this.config.get('myNewOption');
await this.config.set('myNewOption', 'newValue');
```

### Adding a New Storage Key

1. **Use StorageManager**:

```typescript
// For sensitive data (API keys, tokens)
await this.storage.setApiKey('myService', apiKey);
const apiKey = await this.storage.getApiKey('myService');

// For non-sensitive data, use ConfigManager instead
await this.config.set('myData', value);
```

2. **Add Migration if Needed**:

```typescript
// src/infrastructure/storage/StorageManager.ts
async migrateFromLegacy(): Promise<void> {
    // ... existing migrations

    const legacyValue = this.configStorage.get('oldKey');
    if (legacyValue) {
        await this.setApiKey('myService', legacyValue);
        await this.configStorage.delete('oldKey');
    }
}
```

### Adding a New Error Type

1. **Create Error Class**:

```typescript
// src/types/errors/MyError.ts
import { BaseError } from './BaseError';

export class MyError extends BaseError {
  readonly severity = ErrorSeverity.Error;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'MY_ERROR', context);
  }
}
```

2. **Export from index**:

```typescript
// src/types/errors/index.ts
export { MyError } from './MyError';
```

3. **Use in Code**:

```typescript
throw new MyError('Something went wrong', { detail: 'info' });
```

### Adding Property-Based Tests

1. **Create Test File**:

```typescript
// src/__tests__/properties/myFeature.property.test.ts
import fc from 'fast-check';

// **Feature: my-feature, Property 1: My Property Description**
describe('My Feature Properties', () => {
  test('should maintain invariant X', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer(), (str, num) => {
        // Test logic
        const result = myFunction(str, num);
        return result.satisfiesInvariant();
      }),
      { numRuns: 100 },
    );
  });
});
```

2. **Reference Design Document**:

- Each property test must reference a property from design.md
- Use the exact format: `**Feature: feature-name, Property N: Description**`

### Code Style Guidelines

1. **File Size**: Keep files under 300 lines
2. **Function Size**: Keep functions under 50 lines
3. **Naming**: Use descriptive names (PascalCase for classes, camelCase for functions)
4. **Comments**: Add JSDoc for all public APIs
5. **Imports**: Use absolute imports from `src/` when possible
6. **Error Handling**: Always use try-catch with ErrorHandler
7. **Logging**: Log important operations and errors
8. **Types**: Avoid `any`, use `unknown` for untyped values; use proper TypeScript types

### Debugging Tips

1. **Enable Debug Logging**:

```typescript
const logger = Logger.getInstance();
logger.setLogLevel(LogLevel.Debug);
```

2. **View Output Channel**:

- Open Command Palette (Ctrl+Shift+P)
- Run "Output: Show Output Channels"
- Select "otak-committer"

3. **Debug Extension**:

- Press F5 in VS Code to launch Extension Development Host
- Set breakpoints in TypeScript files
- Use Debug Console for evaluation

4. **Test Specific Component**:

```bash
npm test -- --testNamePattern="MyCommand"
```

### Common Pitfalls

1. **Don't bypass StorageManager**: Always use StorageManager for persistence
2. **Don't bypass ErrorHandler**: Always route errors through ErrorHandler
3. **Don't create circular dependencies**: Check with dependency analyzer
4. **Don't store secrets in Configuration**: Use SecretStorage via StorageManager
5. **Don't forget to dispose**: Add disposables to context.subscriptions
6. **Don't use direct VS Code API in services**: Keep services testable
7. **Don't skip tests**: Write both unit and property tests

### Getting Help

- **Architecture Questions**: Review this document and design.md
- **Requirements**: Check requirements.md
- **Implementation Tasks**: See tasks.md
- **Code Examples**: Look at existing commands and services
- **Testing**: Review existing tests in `__tests__` folders

### Contribution Checklist

Before submitting a PR:

- [ ] Code follows architecture principles
- [ ] No circular dependencies introduced
- [ ] All files under 300 lines
- [ ] JSDoc comments added for public APIs
- [ ] Unit tests written and passing
- [ ] Property tests written if applicable
- [ ] Error handling implemented correctly
- [ ] Logging added for important operations
- [ ] Types properly defined (no `any`; use `unknown` where needed)
- [ ] Code formatted with Prettier
- [ ] Linting passes (ESLint)
- [ ] Manual testing completed
- [ ] Documentation updated if needed

---

### Security Considerations in Code

- **Template size limits**: Template files are capped at 100 KB to prevent resource exhaustion
- **Prompt sanitization**: `customMessage` is limited to 500 chars, template content to 10,000 chars before inclusion in prompts
- **API validation timeout**: API key validation requests have a 30-second timeout via `AbortController`
- **Sequential storage operations**: `SecretStorageProvider.set()` and `delete()` execute primary and backup operations sequentially for consistency
- **Git index.lock retry**: Automatic 1-second delay retry when `index.lock` is detected during staging
- **Sensitive field redaction**: Logger automatically redacts `apikey`, `token`, `secret`, `password` fields
- **Error context sanitization**: `BaseError.toString()` redacts sensitive fields in error context

---

**Last Updated**: February 2026
**Version**: 2.4.0
**Maintainers**: otak-committer team
