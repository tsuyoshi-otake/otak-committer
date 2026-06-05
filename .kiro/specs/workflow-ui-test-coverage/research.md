# Research: Workflow / UI Test Coverage

> **Status**: research / proposal only. No requirements or design yet —
> run `/kiro:spec-requirements workflow-ui-test-coverage` when this work
> is ready to begin.

## Context

The CI vscode-host job added in 2.16.9 (commit `86c805e`) means tests
under `src/commands/__tests__/`, `src/infrastructure/**/__tests__/`,
and `src/ui/__tests__/` now actually execute on every push. The question
shifted from **whether** these tests run to whether their **assertions
are meaningful**.

This research audits the existing test files and the test-free
production files to identify where regressions could currently slip
through. The findings inform the next 2–3 weeks of test work.

## Audit results (quality classification)

| File | Class | LOC | Cases | Reason |
|---|---|---|---|---|
| `src/commands/__tests__/BaseCommand.test.ts` | Weak/Adequate | 115 | 13 | Constructor-wiring sanity. Async test asserts a variable set inside the test's own subclass — not production output. Misses `cleanupPreview()`, `initializeOpenAI()`, `openExternalUrl()` URL-scheme guard. |
| `src/commands/__tests__/BaseCommand.errorHandling.test.ts` | Adequate | 133 | 9 | Verifies `handleErrorSilently` routes through mocked `ErrorHandler.handle` with `component = constructor.name`. Subclass-name test (line 51) is meaningful; rest is mock-echo of the operation string. |
| `src/commands/__tests__/BaseCommand.integration.test.ts` | Weak | 62 | 3 | Test catches its own thrown error, hand-calls `testHandleError`, asserts the mock saw it — tautological. |
| `src/commands/__tests__/BaseCommand.withProgress.test.ts` | **Strong** | 132 | 10 | Locks `withProgress` forwards title + `ProgressLocation.Notification`, returns task result, propagates errors. Real contract. |
| `src/commands/__tests__/CommandRegistry.test.ts` | **Strong** | 168 | 11 | Asserts duplicate-ID throws, count tracking, ID enumeration. |
| `src/commands/__tests__/CommandRegistry.errorHandling.test.ts` | **Strong** | 167 | 6 | Locks metadata shape (`commandId`, `commandTitle`, `commandCategory`, `component`), sync/async handler errors. |
| `src/commands/__tests__/CommandRegistry.execution.test.ts` | **Strong** | 148 | 7 | Verifies arg forwarding, sync handler awaiting, disposable pushed to `context.subscriptions`. |
| `src/commands/__tests__/CommandRegistry.integration.test.ts` | Adequate | 57 | 2 | Lifecycle smoke test, partly redundant with execution.test.ts. |
| `src/commands/__tests__/CommitCommand.test.ts` | Weak | 210 | ~18 | Execute test (`line 131`) `try { execute() } catch {}` with zero assertions — vacuous. Workflow logic in `commit.workflow.ts` not exercised. |
| `src/commands/__tests__/PRCommand.test.ts` | Weak | 209 | ~16 | Same pattern as CommitCommand. `pr.workflow.ts` unverified. |
| `src/commands/__tests__/IssueCommand.test.ts` | Weak | 209 | ~16 | Same pattern. `issue.previewFlow.ts` untested. |
| `src/commands/__tests__/ConfigCommand.test.ts` | Adequate | 299 | ~18 | The QuickPick label test and "options non-empty" tests assert real output. No tests for the post-selection path (`config.update`, success notification, error branch). |
| `src/commands/commit.workflow.ts` | **Missing** | 184 | 0 | No `*.workflow.test.ts` file. |
| `src/commands/pr.workflow.ts` | **Missing** | 265 | 0 | No `*.workflow.test.ts`. |
| `src/commands/issue.previewFlow.ts` | **Missing** | 136 | 0 | No `*.previewFlow.test.ts`. |
| `src/commands/pr.{creation,error,input,preview}.ts`, `issue.input.ts`, `commit.diffProcessing.ts`, `commitMessageInput.ts`, `commandNotifications.ts`, `commandRegistration.ts` | **Missing** | 592 | 0 | No tests. |
| `src/ui/StatusBarManager.ts` | **Missing** | 143 | 0 | UI layer has zero `*.test.ts` files. |
| `src/ui/statusBar.view.ts` | **Missing** | 46 | 0 | Pure functions, trivially testable. |
| `src/ui/statusBar.visibility.ts` | **Missing** | 77 | 0 | Includes regex `parseGitHubRemoteUrl` and `fetchGitHubRepositoryPrivacy` — silent breakage risk on GitHub URL format drift. |
| `src/ui/publicRepoWarning.ts` | **Missing** | 47 | 0 | Persisted suppression state — would spam users or silently suppress warnings on the wrong repo. |

## Top 5 highest-priority gaps

Ranked by user-facing risk × current weakness.

### 1. `src/commands/pr.workflow.ts` — `runPRGenerationWorkflow`

Highest blast radius (PR creation hitting GitHub). Lock down:

- Branch cancel → returns false
- Empty diff → shows `noChangesBetweenBranches` and returns false
- `getBranchDiffDetails` throws → wraps as `ServiceError`
- Preview cancel → returns false
- Draft fallback path
- `createPR` error → `handleCreatePRError` invoked
- `Resolves #N` appended only when `issueNumber` is set

### 2. `src/commands/commit.workflow.ts` — `runCommitGenerationWorkflow`

Lock down:

- Empty diff → returns false + shows notification
- Secret detected + user declines → returns false (no OpenAI call)
- Trailer toggle (`appendTrailer ?? true`) appends `Commit-Message-By: otak-committer`
- Sanitized message is what reaches `setCommitMessageInSourceControl`

### 3. `src/ui/statusBar.visibility.ts` — `parseGitHubRemoteUrl` regex

Pure function; missing tests = silent breakage when GitHub URL formats
vary (SSH `git@github.com:o/r.git`, HTTPS, trailing slash, GHE hosts).
Plus `fetchGitHubRepositoryPrivacy` 4xx → returns true (treat as
private) — security-sensitive default.

### 4. `src/ui/publicRepoWarning.ts` — suppression state mutation

`suppressPublicRepoWarning` deduplicates against existing list;
`isPublicRepoWarningSuppressed` returns false when `repoFullName` is
null. Regression here would either spam users or silently suppress
warnings on the wrong repo.

### 5. `src/commands/issue.previewFlow.ts` — `runIssuePreviewLoop` while-true

- Cancel → undefined
- Create → returns current preview
- Modify with empty trimmed input → continue (no regenerate)
- Modify with text → calls `service.generatePreview` with appended instructions
- Modify cancelled (undefined input box) → returns current preview (subtle UX contract)

## Recommended backlog (next 2–3 weeks)

Implement in this order. Each item is one to two days of test work.

1. **Add `src/ui/__tests__/statusBar.view.test.ts`** — 3 pure-function suites for `getLanguageLabel`, `buildStatusBarText` (public/private/null × icon), `buildStatusBarTooltip` (markdown content, `isTrusted` command allowlist).
2. **Add `src/ui/__tests__/statusBar.visibility.test.ts`** — table-driven `parseGitHubRemoteUrl` (SSH/HTTPS/GHE/malformed) + `fetch` stub for `fetchGitHubRepositoryPrivacy` 200/404/network-error.
3. **Add `src/ui/__tests__/publicRepoWarning.test.ts`** — `Memento` fake; null-name short-circuit; dedup; suppression after `dontShowAgain` selection.
4. **Add `src/commands/__tests__/commit.workflow.test.ts`** — inject fakes for `GitServiceFactory`, `OpenAIService`, `processCommitDiff`, `setCommitMessageInSourceControl`. Cover the five branches in gap #2.
5. **Add `src/commands/__tests__/pr.workflow.test.ts`** — fake `GitHubService` / `BranchSelector` / `OpenAIService` / `showPRPreview` / `createPRWithDraftFallback`. Cover the six branches in gap #1.
6. **Add `src/commands/__tests__/issue.previewFlow.test.ts`** — fake `IssueGeneratorService` + `showQuickPick` / `showInputBox` stubs; cover the four loop branches in gap #5.
7. **Replace vacuous `try { execute() } catch {}` blocks** in `CommitCommand.test.ts:131`, `PRCommand.test.ts:131`, `IssueCommand.test.ts:131` with assertions that the right workflow function was invoked with the right dependencies (or delete them — they catch nothing today).
8. **Extend `ConfigCommand.test.ts`** to drive `showQuickPick` to return a selection and assert `config.update` was called with that value plus the success notification — currently every test cancels.

## Open questions

1. Should test helpers (fake `GitHubService`, fake `IssueGeneratorService`) live under `src/test/fakes/` or per-suite? The existing pattern is per-suite, but the workflow tests will share fakes.
2. The `BaseCommand.integration.test.ts:27` tautology test should be deleted before any of the above is added — keeping it gives false signal once the wiring tests below land.

## Effort estimate

~12–15 person-days for items 1–8. Items 1–3 (UI layer) can run in parallel with items 4–6 (workflow layer) — different files, no shared state.
