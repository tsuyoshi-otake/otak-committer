# Journal

## 2026-10-03 — Default model → gpt-6-luna; codebase review (no Issue)

- Symptom/request: switch the default OpenAI model to `gpt-6-luna` and review the codebase for defects.
- Root cause (found while switching): `reasoningEffort: none` was implemented by omitting `reasoning_effort`. That only meant "no reasoning" while the model default was `none`; `gpt-6-luna` defaults to `medium`, so the setting would have silently become medium.
- Fix: all four operations in `src/services/openaiModels.ts` route to `gpt-6-luna`; `openai.completion.ts` now sends `none` explicitly (cast at the SDK boundary because openai 4.85.4 types lack `none`). Tests, eval harness (baseline `gpt-5.6-luna` vs `gpt-6-luna`), README/ARCHITECTURE/CHANGELOG/CLAUDE.md updated.
- Verification: `npm run compile:test` OK, `npm run lint:ci` OK, `npm run test:unit` 415 passing / 0 failing; routing property + gateway + completion tests 16 passing via direct mocha (property test is excluded from the unit runner).
- Learning: when changing models, re-check every "omit the field" default — API defaults differ per model (gpt-6-luna: reasoning_effort default `medium`; supports none/low/medium/high/xhigh/max).
- Review highlights (not fixed): issue preview Esc-on-modify creates the issue (`src/commands/issue.previewFlow.ts:122`); `sk-proj-` keys containing `-`/`_` evade secret detection (`src/utils/secretDetection.ts:27`); neon regex takes ~2.6 s on 340 KB (`secretDetection.ts:166`); GitHub repo names with dots fail to parse (`src/services/github.init.ts:39`); invalid `openaiBaseUrl` breaks every `BaseService` via `serviceConfig.ts:15`.
- Commit: `57926ea` (`feat(openai): route every operation to gpt-6-luna`).

## 2026-10-03 — Top-5 review fixes (#9)

- Symptom: (1) Esc in the issue modification input created the issue; (2) `sk-proj-`/`sk-admin-`/`sk-svcacct-`/`sk-or-`/`sk-ant-` keys containing `-`/`_` evaded secret detection; (3) connection-string patterns were quadratic on long single-line input (neon 2.1 s, postgres-without-@ 7.9 s, mongodb/mysql/redis 3.4–4.8 s); (4) GitHub repo names with dots / trailing slash failed to parse; (5) an invalid `otakCommitter.openaiBaseUrl` threw inside `getServiceConfig()`, breaking every `BaseService`.
- Root cause: (1) `undefined` from `showInputBox` was treated as approval (`return preview`); (2) character class `[A-Za-z0-9]` plus trailing `\b` excluded base64url keys; (3) unbounded `[^@\s]+` and `.*neon\.tech` rescanned the rest of the line from every scheme occurrence; (4) repo segment `([^.]+)`, duplicated in `github.init.ts` and `statusBar.visibility.ts`; (5) endpoint validation lived in the generic config builder. Found while fixing (5): `BaseCommand.initializeOpenAI` omits `openaiBaseUrl`, and `initializeOpenAIService` resolved `undefined` → env/default and overrode the service config, so the documented setting was ignored by every command.
- Fix: pure `decideIssueModificationStep` (`src/commands/issue.previewDecision.ts`), Esc/blank → back to the action picker; base64url classes without trailing `\b`; credential segments bounded `{1,256}`/`{1,512}`, neon host `[A-Za-z0-9.-]{0,253}`; single `parseGitHubRemoteUrl` in `src/services/github.remote.ts` used by both callers; `getServiceConfig()` returns the raw setting, `initializeOpenAIService` falls back to it when the caller omits the endpoint.
- Verification: `npm run test:unit` 430 passing / 0 failing (+15 new) in the working tree, 406 on the committed tree alone (the other 24 belong to uncommitted proxy/unicode work); `npm run lint:ci` OK; `npm test` (VS Code host) 507 passing / 0 failing, including the new loopback test proving validation hits `GET /v1/models` on the configured URL; timings after fix 3–52 ms; no runner processes left.
- Learning: the VS Code host suite only discovers `out/test/**`, `out/infrastructure/**/__tests__` and `out/__tests__/**` — tests under `src/commands/__tests__` and `src/services/__tests__` that need `vscode` (e.g. `IssueCommand.test.ts`) run nowhere. Put vscode-dependent regression tests in `src/__tests__/integration/` (unit runner excludes them unless the name starts with i18n/bulletList/pr/commitMessage/issue). A partial config passed to an initializer must merge settings the same way `BaseService` does, or optional fields silently fall back to defaults.
- Commit: the `fix: ... (#9)` commit that adds this entry (`git log --grep "#9"`), on top of `57926ea`.

## 2026-10-03 — Remaining review findings (#10: O1–O7, G1–G5, S1–S4)

- Symptom: the 16 findings left after #9. Main ones: (a) cancelling PR/issue progress did not stop the request (O1). (b) Structured output had no `max_completion_tokens`, so truncation looked like a JSON parse error (O2). (c) One huge file could exceed the Tier 3 chunk limit (O3). (d) A 400 whose text mentioned keys opened the API-key dialog (O4). (e) `maxInputTokens` was capped at 400K (O5); the code fell back to `low` reasoning while the manifest said `high` (O6). (f) "Always stage all" ran `git add -A`, so untracked files such as `.env` were staged silently and stayed staged after a cancel (G1). (g) The commit command used the SCM selection instead of the clicked repository (G2). (h) `ls-files` C-quoted non-ASCII paths (G3). Branch/issue lists stopped at 100 and the 300-file compare cap went unnoticed (G4). Duplicate runs, and closing other extensions' preview tabs (G5). (i) Log redaction missed camelCase names and embedded tokens (S2); CI had no `permissions` (S3); JWT detection was quadratic (S4). S1 (plaintext key not migrated) was refuted; a residual read was removed.
- Root cause (G1, the user-decided one): staging decision, staging, and undo were mixed inside `git.diff.ts`. Nothing recorded what the extension had staged, so a cancelled flow could not undo it.
- Fix: G1 is split. `src/services/git.staging.ts` (pure) holds the decision, `git add -u` vs `-A`, `listStagedPaths`, `undoStagingUnlessApplied` and `unstagePaths` (`--literal-pathspecs reset -q --`, batched). `git.stagingPrompts.ts` holds the VS Code prompts. `collectDiff` returns `{diff, stagedByExtension}`, and `commit.workflow.ts` unstages on every outcome that does not apply a message. The other items have their own small modules (`utils/cancellation.ts`, `singleFlight.ts`, `diffChunking.ts`, `secretRedaction.ts`, `previewFileName.ts`, `services/github.pagination.ts`, `infrastructure/error/formatErrorDetail.ts`). The ID → test map is in `.claude/goal-loop/issue-10-remaining-findings/coverage.md`.
- Failure during verification: the host suite failed in the teardown of `collectDiffStaging.test.ts` with `EPERM ... rmSync` on the temp repo. The unit runner passed the same kind of teardown.
- Investigate/verify: the leftover directory had git object files with the `R` attribute. Running VS Code's `Code.exe` with `ELECTRON_RUN_AS_NODE=1` (Node 24.21.0), plain `fs.rmSync(dir,{recursive,force})` failed with EPERM and left the directory. System Node 26.2.0 removed it. The new `src/test/helpers/temp-directory.helper.ts` (`removeTempDirectory`: chmod 0o666, then rmSync) removed the same directory under Node 24.21.0.
- Verification: `npm run test:unit` 519 passing / 0 failing; `npm test` (host) 519 passing / 0 failing, including the 3 G1 host tests; `npm run compile` and `npm run lint:ci` exit 0. The independent rubric-verifier (sonnet) returned overall=pass on C1–C8. That includes the other contributor's hashes being unchanged and no runner process left. Caveat: it did not judge the relevance of each assertion in C6. A mutation check on the compiled G1 code killed 4 of 4 mutants (-u→-A, no literal pathspecs, skipped untracked prompt, removed undo).
- Learning: see `.claude/memory/rules.md`. Also, the C8 process query in the first rubric matched its own PowerShell/bash command line, so it could never return zero rows; filter by process name.
- Commit: none yet (working tree; the user has not asked for a commit).

## 2026-10-03 — README brought up to date (#10 follow-up)

- Symptom: README was out of date. (a) It said GitHub tokens are kept in secure storage, but the extension uses the VS Code GitHub authentication session; only a legacy `otakCommitter.githubToken` setting is migrated. (b) It omitted "Don't Show Again" on the public-repository prompts. (c) It gave no `maxInputTokens` range. (d) It did not say Tier 3 always uses `low`. (e) It mixed "gateway" with the new "OpenAI-compatible endpoint" wording. (f) It did not describe the #10 behaviors.
- Fix: README.md only, 22 insertions and 15 deletions. The other contributor's three hunks (settings row, section heading, base-URL paragraph) are unchanged. Every new statement was checked against code first: `github.init.ts` getSession; `StorageMigrationService` legacy githubToken; `commandRegistration.ts` buttons, singleFlight and abort-previous; `package.json` 1000–922000; `openai.ops.ts` `reasoningEffort: 'low'`; `github.pagination.ts` 100×10 and 300; `openaiInitialize.ts` `retry after Ns`.
- Verification: the other contributor's lines appear exactly once each (grep -F). The only "gateway" left is the example hostname. `check-invisible-unicode.mjs` is clean (428 files).
- Found while verifying (not fixed): G1 undo vs. restart. A second "Generate Commit Message" click aborts run A without awaiting it, so A's `unstagePaths` in `undoStagingUnlessApplied` can run after run B's `git status` and `diff --cached`. B may then write a message for changes that A just unstaged. The race comes from the code structure (the handler does not await the previous run); no failing test reproduces it yet. Proposed fix: the restart path awaits the aborted run's settlement before starting the next run.
- Commit: none yet.

## 2026-10-03 — Commit restart race fixed (#10 follow-up, G1 undo vs. restart)

- Symptom: a second "Generate Commit Message" click aborted run A and started run B at once. A's `undoStagingUnlessApplied` unstage could then land after B had read `git status` / `diff --cached`, so B could write a message for changes A had just unstaged.
- Root cause: the handler in `commandRegistration.ts` kept one `AbortController` and aborted it, but never awaited the aborted run. Cleanup ownership stayed with A while B already read the shared index.
- Fix: `src/utils/restartLatest.ts`. A new call aborts the previous signal, awaits the previous call's settlement (including its cleanup), and a call superseded before it starts never starts. Rejections go to their own caller only. The commit handler uses it, and the `activeCommitAbortController` and its try/finally are removed. `commit.workflow.ts` returns early when the signal is already aborted, both before diff collection and at the start of the undo-guarded step, so a superseded run stops before staging or prompting. README line 49 now says the new run starts once the earlier one has finished cleaning up its staging.
- Verification:
  - New unit tests: 4 in `src/utils/__tests__/restartLatest.test.ts`, plus the real-repo `a restarted run reads the index only after the aborted run has unstaged` in `gitStaging.test.ts`.
  - Mutation on the compiled `out/utils/restartLatest.js`: `await waitForPrevious` → `void` gave 3 failing, including the real-repo race test. Dropping `previousController?.abort()` gave 3 failing. The compiled file was restored.
  - Suites: `npm run test:unit` 524 passing / 0 failing; `npm test` (host) 519 passing / 0 failing. The new tests are unit-only, so the host count is unchanged. `npm run compile` and `npm run lint:ci` exit 0. Only the editor's tsserver processes remain, no runner.
- Spec choices (reported, not guessed away): the new run waits while the earlier run shows a prompt (untracked-files question, secret warning, public-repo warning) and while its 3 s "generated" notification is awaited.
- Learning: when a cancellable run owns cleanup of shared state, restarting must await the aborted run's settlement. Aborting alone moves the race, it does not remove it.
- Commit: none yet.

## 2026-10-03 — Host suite flakiness found while verifying the restart fix (#10 follow-up)

- Symptom 1: `npm test` failed in `OpenAI base URL setting` with `Error: Configuration delete failed`, thrown from a stub defined in `StorageManager.errorHandling.test.js`. The same code had passed one run earlier.
- Root cause 1: `StorageManager.errorHandling.test.ts`, `mockWorkspaceConfiguration` in `storageTestHelpers.ts` (used by the migration and storageFailure suites) and `ConfigManager.test.ts` replaced `vscode.workspace.getConfiguration` and never restored it. `glob` does not fix the file order, so the last leaking file differs between runs, and with it what later files see.
- Fix 1: `mockWorkspaceConfiguration` returns a restore function, and each of the 4 suites restores in `teardown`. errorHandling now uses the helper instead of inline stubs. `src/test/suite/index.ts` gets a root `afterEach` that restores a replaced `getConfiguration`, records the test title, and fails the run naming it.
- Verification 1: mutation `restoreConfiguration?.()` → `void 0` in the compiled errorHandling test → the runner named both tests and exited 1; all 519 tests still ran. After the fix, `Configuration delete failed` appears once (the test that throws it), not in later suites.
- Symptom 2: twice (the verifier's run, and my run at 02:54) the host stopped after about 250 tests with `Exit code: 1` and no mocha summary.
- Investigation 2: in both runs `.vscode-test/user-data/logs/<ts>/window1/exthost/exthost.log` ends with `Extension host terminating: received terminate message from renderer`. The test window was closed. It was not a crash, a test failure or a rejection: no error is logged, and it stopped in different test files. No host test executes `otak-committer.generateMessage`, and no code calls closeWindow/reloadWindow. Who closed the window is not established; candidates are a person or another session closing the popped-up test window.
- Verification: `npm test` passed on 3 of 5 runs; the 2 failures are the window-close case above. `npm run test:unit` 524 passing; `lint:ci` exit 0. The rubric-verifier (sonnet) returned overall=pass on C1–C9 of `.claude/goal-loop/issue-10-restart-race/rubric.md`. No runner process left.
- Commit: none yet.

## 2026-10-03 — #10 committed

- Commits: `8126e74` (`test: restore vscode.workspace.getConfiguration after host tests (#10)`), then the `fix: ... (#10)` commit that adds this entry (`git log --grep "#10"`), on top of `8126e74`.
- Left out on purpose: the other contributor's uncommitted work:
  - Their hunks in `package.json` (capabilities, lint:unicode, test:proxy, the https-proxy-agent removal).
  - Their hunks in `ci.yml` (the bundle build and invisible-Unicode scan steps).
  - Their lines in README.md (the openaiBaseUrl row, the "Compatible Endpoints" heading, the base-URL paragraph).
  - All of `src/services/github.init.ts`, `.vscodeignore`, `eslint.config.mjs` and `package-lock.json`, plus their untracked files.
  - Also left out: `.claude/goal-loop/` (rubrics, coverage map, the unposted Issue comment draft).
- Method:
  - Partial files were staged with filtered `-U0` patches (`git apply --cached --unidiff-zero`).
  - README was staged by building its index blob with those 3 lines reset to HEAD.
  - Afterwards, `git diff` on ci.yml, package.json and README.md showed only the contributor's lines.
- Verification on the staged trees alone (exported index plus linked node_modules):
  - Commit 1: compile, compile:test and lint:ci exit 0.
  - Commit 2: compile and lint:ci exit 0; test:unit 500 passing / 0 failing. That is 24 fewer than the working tree's 524. The missing 24 are the contributor's untracked tests, the same gap as in #9.
  - The staged additions contain no real emails (only example.com/.invalid placeholders), no local paths and no token-like strings.
  - No runner process was left.
- Residual: the committed README still has the heading "OpenAI Models and Gateway", while its body now says "endpoint". The contributor's uncommitted heading change resolves this.
- Learning: see rules.md [commit-scope] and [git-identity].
