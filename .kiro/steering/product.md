# Product Overview

`otak-committer` is a VS Code extension (publisher `odangoo`, name
`otak-committer`) that uses the OpenAI API to draft Git commit messages,
GitHub pull request titles/bodies, and GitHub issue titles/bodies from the
state of the active repository.

The extension is published to the VS Code Marketplace and consumed by
individual developers and teams who want AI-assisted SCM authoring without
leaving the editor.

## Core Capabilities

- **Commit message generation** — Reads the staged diff via the active SCM
  repository, classifies files by priority (`src/constants/diffClassification.ts`),
  runs a three-tier hybrid strategy (whole diff → smart prioritization →
  map-reduce summarization), and returns a message in the user-selected
  natural language and message style (`simple` / `normal` / `detailed`).
- **Pull request generation** — Builds a base/compare diff via Octokit,
  honors a PR template if one exists, and asks OpenAI for structured
  `{ title, body }` JSON. Entry point: `src/commands/PRCommand.ts` →
  `src/commands/pr.workflow.ts`.
- **Issue generation** — Collects user input plus optional file context and
  generates a GitHub issue. Entry point: `src/commands/IssueCommand.ts` →
  `src/commands/issue.previewFlow.ts` → `src/services/issueGeneratorService.ts`.
- **Git worktree awareness** — All git reads resolve the SCM-selected
  repository rather than the first repository in the window
  (`src/services/git.repository.ts`).
- **Localized UI + output** — UI strings load from `package.nls.*.json` and
  `src/i18n/locales/*.json`; generated commit/PR/issue text is produced in
  one of 25 natural languages registered in `src/i18n/supportedLocales.ts`.

## Target Use Cases

- A developer stages changes in VS Code's Source Control panel and clicks
  **Generate Commit Message** to get a conventional-commit-style message
  (configurable via `otakCommitter.useConventionalCommits`).
- A developer pushes a feature branch and clicks **Generate Pull Request**
  to draft a PR title/body against a chosen base branch.
- A developer triages work and clicks **Generate Issue** to produce a
  structured GitHub issue from a short prompt and selected files.
- A multilingual team uses `otakCommitter.language` per-workspace to emit
  output in the team's working language while keeping the UI in the host's
  locale.

## Value Proposition

- **Editor-native** — All three flows are reachable from the Source Control
  title bar (`scm/title`); no separate CLI or web tool.
- **Worktree-correct** — Operates on the SCM-selected repository, so it
  behaves correctly inside linked worktrees and multi-root workspaces.
- **Secret-safe by construction** — API key is stored in VS Code
  `SecretStorage` (`src/infrastructure/storage/storageApiKey.ts`); diffs
  and prompts pass through secret-detection
  (`src/utils/secretDetection.ts`) before being sent to OpenAI; the logger
  redacts URLs with credentials, bearer tokens, and known secret formats
  (`src/infrastructure/logging/logSanitizer.ts`).
- **Large-diff aware** — Lock files are dropped to a summary line;
  low-priority files (`*.min.*`, `*.d.ts`, build output) are deprioritized
  so that source changes dominate the prompt budget
  (`src/constants/diffClassification.ts`,
  `src/services/mapReduceSummarizer.ts`).
- **Configurable model behavior** — `otakCommitter.reasoningEffort`
  (`none | low | medium | high`) is forwarded to the reasoning model as
  the `reasoning_effort` parameter (`src/services/openai.completion.ts`).

## Out of Scope

- **Local / on-device inference.** The extension requires an OpenAI API
  key; there is no Ollama, llama.cpp, Azure OpenAI, or self-hosted backend
  path.
- **Provider abstraction.** Only OpenAI is supported. `ServiceProvider`
  (`src/types/enums/ServiceProvider.ts`) names `openai` and `github`; there
  is no Anthropic / Gemini / Bedrock client.
- **Non-GitHub forges.** PR and issue creation use Octokit
  (`@octokit/rest`); GitLab, Bitbucket, Azure Repos, and Gitea are not
  targets.
- **Automatic commits without review.** Generated commit messages are
  written into the SCM input box for the user to edit and confirm; the
  extension does not call `git commit` directly.
- **Authoring code changes.** The extension only summarizes existing
  diffs / context. It is not a code-generation or refactor tool.

## Success Criteria

- Generated content is usable as-is in over 90% of routine commits and PRs
  for the user's target language and style.
- API keys never leave `SecretStorage`; logs and error messages never
  contain raw keys, bearer tokens, or credential-bearing URLs (enforced by
  `logSanitizer` and `BaseError.toString()`).
- Large diffs (>200K-token input budget) still produce a message via the
  map-reduce path rather than failing.
- Architecture and file-size invariants hold:
  `src/__tests__/properties/architecture.property.test.ts` passes (no
  circular deps, layer boundaries respected, source files within the
  configured size cap).

## Workflow Discipline

This repository follows the Kiro spec-driven workflow described in
`CLAUDE.md`:

- Specs live under `.kiro/specs/<feature>/` (requirements → design → tasks
  → implementation).
- Steering files in this directory are AI project memory and must remain
  terse, factual, and free of marketing language.
