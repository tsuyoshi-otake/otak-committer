# Project Structure

## Organization Philosophy

Layered architecture. Each layer has a single responsibility and depends
only on layers below it. Within a layer, files are organized by feature
(`commit.*`, `pr.*`, `issue.*`, `git.*`, `github.*`, `openai.*`,
`apiKey.*`, `storage*`) and a "thin coordinator + extracted workflow"
pattern is preferred over fat classes.

The dependency rule (validated by
`src/__tests__/properties/architecture.property.test.ts`):

```
extension.ts -> commands/ -> services/ -> infrastructure/ -> types/
```

Higher layers may import from lower layers; the reverse is forbidden.
Lateral imports inside a layer should be minimized; if two siblings need
shared logic, push it down (often to `utils/` or `infrastructure/`).

## Top-Level Layout

```
src/
  extension.ts          # 80-line entry point: activate/deactivate only
  commands/             # User-facing command classes + workflow extractions
  services/             # Business logic, external APIs (OpenAI/GitHub/Git)
  infrastructure/       # logging, config, storage, error — cross-cutting
  ui/                   # StatusBarManager + sub-helpers
  i18n/                 # TranslationManager + 25 locale JSONs
  languages/            # Per-natural-language prompt fragments
  constants/            # diff classification, commit guide, token limits
  types/                # enums/, interfaces/, errors/ — no runtime deps
  utils/                # encryption, sanitization, secret detection,
                        # diff assembly/truncate, preview, etc.
  test/                 # Test runners (run-unit-tests.ts, runTest.ts)
  __tests__/            # Property + integration test roots
```

Co-located `__tests__/` folders exist next to most source folders
(`commands/__tests__/`, `services/__tests__/`, `infrastructure/*/__tests__/`,
`utils/__tests__/`, `i18n/__tests__/`).

## Directory Patterns

### Commands (`src/commands/`)
**Purpose**: Bridge VS Code commands to services. Handle user input,
progress, confirmation dialogs, and error display only.
**Pattern**: One **command class** per command, extending `BaseCommand`,
plus optional **workflow files** that hold the multi-step logic so the
class stays small.
**Examples**:
- `CommitCommand.ts` is ~50 lines and delegates to `commit.workflow.ts`
  (which uses `commit.diffProcessing.ts`, `commitMessageInput.ts`).
- `PRCommand.ts` is ~30 lines and delegates to `pr.workflow.ts` (with
  `pr.input.ts`, `pr.preview.ts`, `pr.creation.ts`, `pr.error.ts`).
- `IssueCommand.ts` uses `issue.input.ts`, `issue.previewFlow.ts`.
- `commandRegistration.ts` wires every command into the registry; the
  legacy `commands/index.ts` barrel was removed in 2.16.9 — import command
  classes from their source files.

### Services (`src/services/`)
**Purpose**: Business logic and integrations. Stateless where possible,
no direct dependency on VS Code UI (notifications etc. flow back through
returned values / callbacks).
**Pattern**: A **coordinator file** (`openaiService.ts`, `git.ts`,
`github.ts`) holds a small class; **`<name>.<concern>.ts`** files hold
extracted operations.
**Examples**:
- `openaiService.ts` → `openai.ops.ts` (per-operation functions) →
  `openai.completion.ts` (transport: `requestTextCompletion`,
  `requestStructuredCompletion`).
- `git.ts` → `git.diff.ts`, `git.staging.ts`, `git.repository.ts`,
  `git.templates.ts`.
- `github.ts` → `github.init.ts`, `github.branches.ts`, `github.diff.ts`,
  `github.issues.ts`, `github.pulls.ts`.
- `issueGeneratorService.ts` → `issueGenerator.analysis.ts`,
  `issueGenerator.prompts.ts`, `issueGeneratorFactory.ts`.
- `apiKey.flow.ts` + `apiKey.prompts.ts` + `ApiKeyManager.ts` +
  `ApiKeyValidator.ts`.

### Infrastructure (`src/infrastructure/`)
**Purpose**: Cross-cutting concerns. Singletons or small classes that
commands and services share.
**Sub-areas**:
- `logging/` — `Logger` (singleton, OutputChannel) + `logSanitizer` for
  redaction.
- `config/` — `ConfigManager` type-safe wrapper over
  `vscode.workspace.getConfiguration('otakCommitter')`.
- `storage/` — `StorageManager` coordinates `SecretStorageProvider`,
  `ConfigStorageProvider`, `SyncedStateProvider`; legacy data flows
  through `StorageMigrationService`; per-concern files include
  `storageApiKey.ts`, `storageSync.ts`, `StorageDiagnostics.ts`.
- `error/` — `ErrorHandler` centralizes severity, notification, and
  logging; error types live in `types/errors/`.

### Types (`src/types/`)
**Purpose**: Compile-time contracts only. No runtime side effects, no
imports from any higher layer.
**Sub-areas**:
- `enums/` — `MessageStyle`, `SupportedLanguage`, `GitStatus`,
  `IssueType`, `PromptType`, `ReasoningEffort`, `ServiceProvider`.
- `interfaces/` — `Config`, `Storage`, `Git`, `GitHub`, `Issue`,
  `Common`.
- `errors/` — `BaseError` (abstract, polymorphic `severity`), plus
  `ValidationError`, `ServiceError` (+ `OpenAI*`/`GitHub*`/`Git*`
  subclasses), `StorageError`, `CommandError`, `CriticalError`.

The legacy shim files (`types/git.ts`, `types/github.ts`,
`types/language.ts`, `types/messageStyle.ts`, `types/issue.ts`) were
removed in 2.16.9. Import from `types` (the barrel) or from
`types/enums/<Name>` / `types/interfaces/<Name>` directly.

### i18n (`src/i18n/`)
**Purpose**: UI translation lookup. **One source of truth** for the
locale registry: `supportedLocales.ts`. Locale JSON payloads live in
`locales/<code>.json`. To add a UI language, add one entry to `LOCALES`
in `supportedLocales.ts` and a JSON file in `locales/`.

### Languages (`src/languages/`)
**Purpose**: Per-natural-language prompt fragments used to instruct the
model in the chosen output language. Distinct from `i18n/` (UI strings).
Each file (`english.ts`, `japanese.ts`, …) exports prompt snippets keyed
by `PromptType`. `prompts.ts` is the dispatcher; `index.ts` re-exports
`SupportedLanguage`.

### Constants (`src/constants/`)
**Purpose**: Tunable numbers and classification tables. Examples:
- `tokenLimits.ts` — `MAX_INPUT_TOKENS`, `CHARS_PER_TOKEN`.
- `diffClassification.ts` — `FilePriority` enum, `LOCK_FILE_NAMES`,
  `LOW_PRIORITY_PATTERNS`, `classifyFilePriority()`.
- `commitGuide.ts` — Conventional-Commits guidance injected into prompts.

### Utils (`src/utils/`)
**Purpose**: Pure helpers with no external state. Many are marked
`@internal` and consumed within a single layer; do not export them as
public API. Notable members: `encryption.ts`, `secretDetection.ts`,
`sanitization.ts`, `errorGuards.ts`, `diff.*` (`assemble`, `categorize`,
`truncate`, `types`), `preview.ts`, `conventionalCommits.ts`,
`edgeCase*`.

## Naming Conventions

- **Classes**: `PascalCase` (`CommitCommand`, `StorageManager`,
  `OpenAIService`). File name matches the class.
- **Coordinator-style services**: `camelCase` file name (`openaiService.ts`,
  `git.ts`), class inside is `PascalCase`.
- **Extracted workflow / op files**: dotted lowercase
  (`commit.workflow.ts`, `pr.input.ts`, `openai.ops.ts`,
  `github.pulls.ts`). The prefix groups the file by feature so siblings
  sort together.
- **Tests**: `<subject>.test.ts` for examples,
  `<subject>.property.test.ts` for `fast-check` properties.
- **Folders**: lowercase (`commands/`, `infrastructure/storage/`); type
  sub-folders are lowercase plural (`enums/`, `interfaces/`, `errors/`).
- **Command IDs**: prefixed `otak-committer.<verb>` (`generateMessage`,
  `generatePR`, `generateIssue`, `setApiKey`, `diagnoseStorage`,
  `openSettings`, `changeLanguage`, `changeMessageStyle`).
- **Config keys**: namespaced under `otakCommitter.*` in `package.json`.

## Import Organization

- Import types and shared symbols from the **barrel** of the target
  layer when one exists: `from '../types'`, `from '../infrastructure'`,
  `from '../infrastructure/logging'`, `from '../infrastructure/storage'`.
- Deep imports (`from '../types/enums/MessageStyle'`) are tolerated only
  when the barrel does not re-export the symbol, but prefer adding it to
  the barrel.
- `extension.ts` uses **`.js` import extensions** because the bundled
  output is CommonJS; mirror that style only inside `extension.ts` and
  files it directly imports during activation. The rest of the tree uses
  extensionless TS imports.

```typescript
// Good — barrel
import { MessageStyle, ServiceConfig } from '../types';
import { Logger } from '../infrastructure/logging';
import { StorageManager } from '../infrastructure/storage';

// Avoid when the barrel exports the symbol
import { MessageStyle } from '../types/enums/MessageStyle';
```

## Where to Add New Code

- **New VS Code command**: add a class under `src/commands/` extending
  `BaseCommand`; register it in `commands/commandRegistration.ts` and
  add the `command` / `menus` entries to `package.json`. Keep the class
  thin — put multi-step logic in a sibling `<feature>.workflow.ts`.
- **New service / API integration**: add a coordinator
  (`<name>Service.ts` or `<name>.ts`) in `src/services/`, split
  per-operation logic into `<name>.<concern>.ts` files, and route logs
  through `Logger.getInstance()` and errors through the appropriate
  `ServiceError` subclass.
- **New configuration option**: extend `ExtensionConfig` in
  `src/types/interfaces/Config.ts`, declare the property under
  `contributes.configuration.properties.otakCommitter.*` in
  `package.json`, and read it via `ConfigManager.get()`.
- **New error type**: extend `BaseError` in `src/types/errors/`, set a
  static `severity`, and re-export from `types/errors/index.ts`.
- **New supported UI locale**: append a `LocaleSpec` entry to `LOCALES`
  in `src/i18n/supportedLocales.ts`, add a `locales/<code>.json`, and
  drop the corresponding `package.nls.<code>.json` at the repo root.
- **New supported output language**: add a file under `src/languages/`,
  add the enum value to `types/enums/SupportedLanguage.ts`, and register
  it in `languages/prompts.ts` / `languages/index.ts`. Also add the enum
  string to the `otakCommitter.language` enum in `package.json`.
- **New property test**: place under `src/__tests__/properties/<name>.
  property.test.ts`, tag with
  `**Feature: <feature>, Property N: <desc>**`, and reference the spec
  in `.kiro/specs/<feature>/`.

## Code Organization Principles

- **Thin entry point.** `extension.ts` only wires infrastructure and
  registers commands; no business logic.
- **Workflow extraction.** When a command grows past trivial input/output,
  split orchestration into a `<feature>.workflow.ts` and keep the command
  class as a registration shim.
- **Single source of truth for locales.** The 25-language list is owned
  by `src/i18n/supportedLocales.ts`; do not duplicate lookup tables
  elsewhere.
- **Sanitize before logging.** Anything written to the logger or surfaced
  in an error message passes through `logSanitizer` and
  `BaseError.toString()` redaction. Do not bypass.
- **Secret detection before LLM calls.** Diff and prompt payloads pass
  through `utils/secretDetection.ts` before being sent to OpenAI in the
  PR, issue, and map-reduce paths.
- **No direct VS Code API in services.** Services receive data and
  callbacks; UI calls happen in `commands/` or `ui/`. This keeps services
  testable under the standalone Mocha runner.
