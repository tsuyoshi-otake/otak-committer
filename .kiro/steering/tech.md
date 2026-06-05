# Technology Stack

## Architecture

Layered VS Code extension. Entry point bootstraps infrastructure, then
registers commands that delegate to services. See `ARCHITECTURE.md` for the
full diagram; the layer rule is **higher layers depend on lower layers,
never the reverse**:

```
extension.ts (entry)
   -> commands/        (user interaction, progress, orchestration)
      -> services/     (git, github, openai, prompt building, sanitization)
         -> infrastructure/  (logging, config, storage, error)
            -> types/  (enums, interfaces, errors — no dependencies)
```

This boundary is enforced by
`src/__tests__/properties/architecture.property.test.ts` and
`src/__tests__/helpers/dependency/dependencyAnalyzer.ts`.

## Core Technologies

- **Language**: TypeScript 5.7 (`strict: true`, `noImplicitAny`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`).
- **Runtime**: VS Code Extension Host on Node 20-class APIs. Minimum
  `vscode` engine: `^1.90.0` (`package.json`).
- **Bundler**: `esbuild` (`platform=node`, `format=cjs`,
  `external:vscode`, output `out/extension.js`).
- **Test runner**: Mocha with the **TDD UI** (`suite` / `test`), plus
  `fast-check` for property-based tests. There is no Jest and no Vitest.
- **VS Code test harness**: `@vscode/test-cli` + `@vscode/test-electron`
  for in-VS-Code suite runs; `src/test/run-unit-tests.ts` runs a
  vscode-independent subset under plain Mocha for fast iteration.
- **Lint / format**: `eslint` (`eslint src`) and `prettier`.

`tsc` itself is run with `--noEmit` for type-checking
(`npm run compile`); test compilation uses `tsconfig.test.json`
(`compile:test`). The shipped runtime bundle is produced by
`esbuild-base`, not by `tsc`.

## Key Libraries

Document only the ones that shape patterns; pin versions when migration
matters.

- **`openai` ^4.85** — Official SDK. The extension uses
  `openai.chat.completions.create` (not the `/v1/responses` endpoint
  despite some inline comments) via two thin wrappers in
  `src/services/openai.completion.ts`:
  - `requestTextCompletion` — plain text completion (used for commit
    messages with `max_completion_tokens: 5000`, chunk summaries,
    chat completions).
  - `requestStructuredCompletion<T>` — `response_format.type =
    'json_schema'` with `strict: true` (used for PR `{ title, body }`
    in `src/services/openai.ops.ts`).
- **`@octokit/rest` ^21** — GitHub API client. Used by
  `src/services/github.*.ts` for branches, diffs, issues, PRs.
- **`simple-git` ^3.36** — All raw git operations
  (`src/services/git*.ts`). The extension wraps it through the VS Code
  Git extension API when discovering repositories
  (`git.repository.ts`) so worktrees resolve correctly.
- **`https-proxy-agent` ^7** — Honors `https_proxy` / `HTTPS_PROXY` env
  for OpenAI / GitHub calls.
- **`fast-check` ^4** — Property tests under
  `src/__tests__/properties/`. Each property is tagged with a feature
  and property number that maps back to a spec in `.kiro/specs/`.
- **`@dotenvx/dotenvx`** — Used only by `npm run test:integration` to
  load `.env.local` for `OPENAI_API_KEY`. Production code never reads
  `.env`.

No token-counting library is used. Tokens are estimated heuristically
(`TokenManager.estimateTokens` = `Math.ceil(text.length / CHARS_PER_TOKEN)`
in `src/services/tokenManager.ts`). Do not introduce `gpt-tokenizer` or
`tiktoken` without an explicit spec.

## OpenAI Integration

- **Model**: `gpt-5.4`, hard-coded as
  `OpenAIService.MODEL` in `src/services/openaiService.ts`. There is
  currently **no automatic fallback** to `gpt-5.4-mini` — earlier
  fallback logic was removed (see `src/services/__tests__/completion.test.ts`:
  `'requestTextCompletion should rethrow failures without fallback retry'`).
- **Reasoning-model conventions**: messages use `role: 'developer'` for
  the system prompt and pass `reasoning_effort`. **No `temperature`** is
  sent. See `createCompletionParams` in `openai.completion.ts`.
- **Reasoning effort**: comes from the user setting
  `otakCommitter.reasoningEffort` (`none | low | medium | high`); `none`
  is translated to `undefined` before sending.
- **Request timeout**: 120s per call (`REQUEST_TIMEOUT_MS`).
- **Abort support**: All ops thread an optional `AbortSignal` through.
- **Auth flow**: `openaiInitialize.ts` validates keys once per session
  (cached by SHA-256), branches between explicit-key and stored-key
  paths, and routes auth failures (`401`) to a dialog that can
  reset / remove the stored key.

## Storage & Secrets

- **Primary**: VS Code `SecretStorage`
  (`src/infrastructure/storage/SecretStorageProvider.ts`,
  `storageApiKey.ts`).
- **Backup**: `globalState` with AES-256 + PBKDF2 (600,000 iterations)
  (`src/utils/encryption.ts`).
- **Optional cross-machine sync**: opt-in via Settings Sync
  (`storageSync.ts`, `SyncedStateProvider.ts`).
- **Legacy migration**: `StorageMigrationService` reads any plaintext
  legacy config keys, copies them into SecretStorage, then deletes the
  legacy entry. Migration runs on activation.
- **Never** write API keys or tokens to `Configuration`. Use
  `StorageManager.getApiKey` / `setApiKey`.

## Logging & Redaction

- Singleton `Logger` (`src/infrastructure/logging/Logger.ts`) writes to a
  VS Code OutputChannel and routes every record through
  `logSanitizer.ts` before write.
- `logSanitizer` redacts: field names matching
  `apikey|token|secret|password|authorization|credential|bearer`, known
  secret prefixes (OpenAI `sk-…`, GitHub `ghp_…`, AWS, Slack, GitLab),
  URL credentials (`user:password@host`), and matching patterns in
  stack traces.
- `BaseError.toString()` mirrors the same redaction for error context.

## Development Standards

### Type Safety
- `strict` mode on. Use `unknown` rather than `any` for untyped inputs.
- Import types from the central `src/types/index.ts` barrel
  (`import { MessageStyle } from '../types'`), not from sub-files.
- The legacy shim layer (`types/git.ts`, `types/github.ts`,
  `types/language.ts`, `types/messageStyle.ts`, `types/issue.ts`) was
  removed in 2.16.9. Use `types/enums/*` and `types/interfaces/*`.

### Code Quality
- File size cap is enforced by the architecture property test (currently
  400 code lines, excluding comments/blanks). Split before adding.
- ESLint must pass (`npm run lint:ci` runs with `--max-warnings=0`).
- Prettier is the formatter; do not hand-format.

### Testing
- Unit and property tests live in `__tests__/` directories colocated with
  source.
- Integration tests under `src/__tests__/integration/` may hit the real
  OpenAI API; they require `OPENAI_API_KEY` in `.env.local` and run via
  `npm run test:integration` (which is `dotenvx run -- npm test`).
- Property tests carry a `**Feature: <name>, Property N: <desc>**`
  comment that references a spec under `.kiro/specs/`.
- The `architecture.property.test.ts` suite enforces: no circular deps,
  layer boundaries, file size limits, Public API documentation baseline.

## Development Environment

### Required Tools
- Node.js compatible with `@types/node: 20.x`.
- VS Code `^1.90.0` for `code --extensionDevelopmentPath` debugging.

### Common Commands
```bash
npm run compile           # tsc --noEmit type check
npm run lint              # eslint src
npm run lint:ci           # eslint src --max-warnings=0
npm run format            # prettier . --write
npm run esbuild           # bundle out/extension.js (sourcemaps)
npm run test:unit         # standalone Mocha (vscode-independent)
npm test                  # full suite via @vscode/test-electron
npm run test:integration  # dotenvx run -- npm test (needs OPENAI_API_KEY)
```

## Key Technical Decisions

- **Chat Completions API, not Responses API.** Despite older comments
  mentioning `/v1/responses`, the live code path is
  `openai.chat.completions.create`. Update comments when touching
  `openai.completion.ts`.
- **Structured output for PRs, plain text for commits.** Commit messages
  are free-form Markdown / Conventional Commits; the PR flow needs a
  reliable `{ title, body }` split, which JSON Schema gives us.
- **`developer` role + `reasoning_effort`, no `temperature`.** Required
  by the `gpt-5.4` reasoning model. Do not add `temperature` to
  `createCompletionParams`.
- **Token budgeting by character heuristic, not by tokenizer.** Keeps the
  bundle small and avoids native deps; over-estimation is mitigated by
  `SAFETY_MARGIN = 0.95`.
- **AES-256-GCM with PBKDF2 (600k iters)** for the encrypted backup of
  the API key, per OWASP 2023 guidance.
