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

## 2026-10-03 — release 2.18.0 (#9, #10)

- Commit: `d8236d2` `chore(release): 2.18.0`, pushed to origin/main. Only CHANGELOG.md plus the version lines of package.json and package-lock.json were staged; the contributor's package hunks stay uncommitted, and their diff was unchanged before and after.
- CHANGELOG: entries added under [2.17.0] after it shipped were moved to [2.18.0]. [2.17.0] was restored from `ae54d64`, with "Responses API" corrected to "Chat Completions" (the 2.17.0 code used `chat.completions.create`).
- Build: `checkout-index` of the index into the scratchpad, then a fresh `npm ci` (not a junction: the repo's node_modules follows the contributor's lockfile, which drops https-proxy-agent). compile and lint:ci exit 0; test:unit 500 passing / 0 failing (TKW run 8ef8f9453ba051d9351ebd98c53892f1).
- Symptom: `vsce package` (3.9.1) failed with "Extension entrypoint(s) missing: extension/out/extension.js" in the export, and `vsce ls` listed nothing. With `--no-dependencies` it listed 41 files, identical to `vsce ls` in the repo. Root cause not isolated: `npm ls --omit=dev --parseable` in the export printed normal paths. The `.vscodeignore` excludes node_modules, so dependency detection does not change the contents.
- VSIX: `~/tmp/otak-committer-release/otak-committer-2.18.0.vsix`, 43 files, 1.18 MB, sha256 2beb6c55…95f8. Version 2.18.0, no src/.ts/.map files, none of the contributor's files, no personal-data strings.
- Independent verifier (rubric `.claude/goal-loop/release-2.18.0/rubric.md`): 8 of 8 criteria pass.
- Publishing: not done by the agent. The vsce credential store has only publisher `otak`, VSCE_PAT is unset, and `--azure-credential` failed because the az CLI is signed in to the work tenant and its refresh token expired (AADSTS700082). The user must run `vsce login odangoo` and enter the PAT. Open VSX is at 2.16.11 (2.17.0 was never published there); ovsx is not installed.
- Pre-release check (global rule):
  - History contains the work email in 86 commits (2025-02-15 to 2025-04-27, all 16 tags). The repository is already public (0 forks). It was not rewritten, because that needs the user's decision (force push of main and all tags).
  - `.vscode/settings.json` contains a Snyk organization UUID. It is excluded from the VSIX and was left unchanged.
  - LICENSE (MIT) exists.
  - npm audit: dev-only findings (high); runtime `--omit=dev` has 0.
- Learning: rules.md [vsce-package], [publish-auth].

## 2026-10-03 — release 2.18.0 via CI (tag-triggered CD)

- Trigger: the user asked "can't this be done through CI/CD?" instead of entering a PAT locally. The repository already had `VSCE_PAT` and `OVSX_PAT` secrets (2026-07-11) but no publish workflow.
- Commit `b1aa652` `ci: publish Marketplace releases from version tags`:
  - `.github/workflows/release.yml` has 2 jobs. `package` runs without secrets: tag guard, npm ci, compile, lint:ci, test:unit, `vsce package --no-dependencies`, then artifact upload. `marketplace` is the only job with VSCE_PAT; it does a sparse checkout of release-tools and runs `vsce publish --packagePath --skip-duplicate`.
  - `.github/release-tools` pins `@vscode/vsce` 4.0.0 with its own lockfile.
- Tool choice:
  - vsce 3.9.1/3.9.2 had 6 high audit findings (secretlint → globby → fast-glob → micromatch → braces). vsce 4.0.0 (2026-09-14) audits clean and needs Node ≥ 22.
  - ovsx 1.2.0 depends on vsce 3.9.2 and brings the same 6 findings back, so Open VSX was left out. It is still at 2.16.11.
- Local verification:
  - The export of the commit tree produced the same 43-file VSIX with a byte-identical `out/extension.js` as the d8236d2 build.
  - Tag guard: v2.18.0 on main passed; v2.18.1 failed; a dangling commit failed.
- Release: tag `v2.18.0` (annotated, on b1aa652) → run 37104627677 succeeded.
  - Linux unit tests: 485 passing + 15 pending, matching CI on main.
  - Publish log: "Published odangoo.otak-committer v2.18.0."
  - The Marketplace public query kept returning 2.17.0 for several minutes after publishing (Marketplace verification delay).
- Learning: rules.md [release] replaces [publish-auth].
- Marketplace listing: confirmed 2.18.0 by the public extensionquery API after publishing (poll every 60–75 s).

## 2026-10-03 — Open VSX publishing in the release workflow (#11)

- Symptom: Open VSX stayed at 2.16.11. 2.17.0 and 2.18.0 were published only to the Marketplace.
- Root cause: ovsx was left out of `.github/release-tools`. ovsx 1.2.0 (2026-09-10; the newest version older than 7 days) asks for `@vscode/vsce` ^3.7.1. That resolves to 3.9.2, whose tree has 6 high advisories, and the release job fails on high advisories.
- Investigation (ovsx 1.2.0 source):
  - `doPublish` turns a `.vsix` argument into `extensionFile` and then skips `packageExtension`.
  - `createVSIX` is called only inside `packageExtension`.
  - The token comes from `OVSX_PAT`.
  - `--skip-duplicate` ignores errors that end with "is already published.".
  - `main.js` exits 1 when any publish is rejected.
- Fix:
  - `.github/release-tools`: added ovsx 1.2.0, plus `overrides: { ovsx: { "@vscode/vsce": "$@vscode/vsce" } }`. Lockfile regenerated with `--before` 7 days ago. 63 packages were added; all existing entries are unchanged, and there is one vsce (4.0.0).
  - `release.yml`:
    - New `openvsx` job (`needs: package` only, `OVSX_PAT` only in its Publish step, `ovsx publish <vsix> --skip-duplicate`).
    - Both publish jobs now run `npm audit` before publishing.
    - New `workflow_dispatch` input `tag`. The package job checks out `refs/tags/<tag>`. The guard requires dispatch from main and `[[ =~ ^vX.Y.Z$ ]]`.
- Verification:
  - actionlint v1.7.12 passes with exit 0; a mutant with `inputs.tagg` failed it.
  - `guard-test.sh`: 10 of 10 cases pass. The first version used `grep -Eq`, which accepted "v2.18.0\n::warning::x" because grep matches line by line; changed to bash `[[ =~ ]]`.
  - `mock-publish.mjs`: publish → skip duplicate (exit 0) → without the flag, exit 1. The full 1,240,585-byte VSIX was uploaded each time.
  - `age-check.mjs`: all 196 packages are 7 or more days old (newest: bundle-name 4.1.1, 2026-09-25).
  - npm audit: 0 vulnerabilities.
- Pre-release check:
  - The work email is still in history (86 commits; the user's decision).
  - The Snyk UUID in `.vscode/settings.json` is not in the VSIX.
  - LICENSE (MIT) exists.
  - The repository is public with 0 forks.
  - This journal had a local user path (the VSIX location); it was replaced with `~/tmp/…`.
- Learning: rules.md [release] (updated) and [release-tools-audit].
- Post-publish (commit 16b8691):
  - CI passed on 16b8691. Security Scan failed, but the failure predates this change: since 2026-09-20 the root lockfile's dev dependencies (brace-expansion, braces, mocha's js-yaml) fail `npm audit --audit-level=high` (#6, #8). The release-tools audit is separate and reports 0.
  - Dispatch run 37106208701 (`gh workflow run release.yml --ref main -f tag=v2.18.0`):
    - All three jobs succeeded.
    - Marketplace logged "Version 2.18.0 is already published. Skipping publish."
    - Open VSX logged "Published odangoo.otak-committer v2.18.0".
    - All 6 audit lines reported 0 vulnerabilities.
  - The Open VSX API kept returning 2.16.11 for about 90 seconds after "Published" and returned 2.18.0 at t+97s. A check made right after publishing is not proof the release failed.
  - The independent rubric-verifier passed C10 and C11. The Open VSX VSIX is identical to the local build: same size (1,240,585 bytes), same `extension.js` and `package.json` sha256, and the same 43 files.

## 2026-10-03 — Security Scan: dev-dependency advisories (#6)

- Symptom: Security Scan has failed on every push and weekly run since 2026-09-20 (latest: run 37108284037 on 8f1fa00). Its `npm audit --audit-level=high` step reports 6 vulnerabilities (5 high, 1 moderate). CodeQL passes.
- Root cause: new advisories appeared after the #6 overrides were set:
  - brace-expansion 5.0.8 needs 5.0.12 (GHSA-rgw5, -6j4f, -qhr7, -q2hr; most published 2026-09-29).
  - mocha's nested js-yaml 4.3.0 needs 4.3.2 (GHSA-5p4m, -2883).
  - braces ≤3.0.3 has no fixed version (GHSA-vfj7, 2026-09-18). It came only from chokidar 3.6.0, used by `@vscode/test-cli` 0.0.12.
  - @humanfs/node 0.16.6 needs 0.16.8 (moderate, GHSA-p498).
  - All of these are dev-only.
- Fix:
  - `overrides`: `brace-expansion` raised to `>=5.0.12`, `js-yaml` to `^4.3.2`.
  - `@vscode/test-cli` raised to `^0.0.15`, which uses chokidar 5 and so pulls in no braces.
  - Lockfile regenerated with `npm install --package-lock-only --ignore-scripts --before=<7 days ago>`, then `npm update @humanfs/node` with the same flags. Result: 8 packages added, 25 removed, 20 changed.
  - Knock-on version changes: mocha 11.7.5→11.8.0 (test-cli 0.0.15 needs ^11.7.6), c8 10→11, test-exclude 7→8.
  - The other contributor's uncommitted `package.json` and `package-lock.json` edits stay unstaged. Their working-tree lockfile was regenerated the same way and differs from the staged one only by their 3 lines.
- Verification:
  - Staged tree (`checkout-index` to a scratch folder):
    - `npm ci`, then `npm audit --audit-level=high`: 0 vulnerabilities.
    - `npm ls` shows no braces.
    - compile, `lint:ci` and `test:unit` pass (500 passing).
    - `npm test` host suite: 498 passing. The first attempt matched the [host-tests] window-closed signature and was rerun.
  - `vscode-test --list-configuration` still reads `.vscode-test.mjs`.
  - `age-check.mjs`: 347 packages, all 7 or more days old; newest is string-width 8.3.0 (2026-09-24).
  - Node 20: only test-cli 0.0.15 declares a newer Node (>=22). That gives an EBADENGINE warning, not an error, and CI never runs test-cli.
- `age-check.mjs` fix: it reported "no publish time" for npm aliases such as `string-width-cjs`, because it looked packages up by install path. It now takes the registry name from `resolved`.
- Learning: rules.md [deps-audit].

## 2026-10-03 — Remove https-proxy-agent; invisible-Unicode scan (#8)

- Symptom: #8 asks to drop the `https-proxy-agent` runtime dependency without breaking proxy users, declare the Workspace Trust posture, and keep invisible-Unicode payloads (GlassWorm, Trojan Source) out of the repository and the VSIX. Codex left an uncommitted implementation: a custom `nativeProxyFetch` transport plus the Unicode scanner.
- Root cause (proxy):
  - `request: { agent: new HttpsProxyAgent(proxyUrl) }` never had an effect. Octokit 21 sends with `request.fetch || globalThis.fetch` and never reads `agent`.
  - The code also logged `Using proxy: ${proxyUrl}`, which includes any `user:pass` from `http.proxy`.
  - Proxy users were still served because the VS Code extension host patches the global `fetch`. A probe extension in VS Code 1.140.0 and 1.109.5 recorded `CONNECT ... :443` with `Proxy-Authorization`, and `http.noProxy` hosts went direct.
- Decision: no custom transport. Codex's `nativeProxyFetch` was rejected:
  - It validated an HTTPS proxy's certificate against the target host.
  - It had no timeout and buffered responses without a limit.
  - It ignored `http.noProxy`, `http.proxyStrictSSL` and the system certificates, all of which the patched `fetch` handles.
  - Codex's files are backed up in `~/tmp/issue8-backup/codex-issue8-worktree.tar`.
- Fix, commit 1 (proxy):
  - `createGitHubClient` in `src/services/github.init.ts` builds Octokit with `auth` and `userAgent` only. The credential-bearing log line is gone.
  - `https-proxy-agent` removed from `dependencies`. It stays in the lockfile as a dev-only transitive package.
  - `capabilities.untrustedWorkspaces.supported: false`, which equals VS Code's default for an undeclared extension, so activation is unchanged.
  - Tests: host test `githubProxy.integration.test.ts`; manifest test `extensionManifestSecurity.test.ts`.
- Fix, commit 2 (Unicode): Codex's detector, ESLint rule and scanner, plus these review fixes:
  - `--dist` decodes `\u` escapes in JS and JSON.
  - NUL bytes are scanned instead of being treated as binary; invalid UTF-8 fails the scan.
  - New categories: Hangul fillers, private use, unassigned plane 14, deprecated format, CGJ, Khmer inherent vowels, Braille blank, musical format.
  - An unknown option exits 2.
  - Output is capped at 20 findings per file.
  - CI runs the dist scan; `release.yml` scans the unpacked VSIX before upload.
- Verification (working tree):
  - compile and `lint:ci` pass (repository scan: 436 files).
  - `test:unit`: 529 passing. Host `npm test` on VS Code 1.140.0: 499 passing, including the proxy test.
  - Fail-before:
    - A throwing `request.fetch` injected into `out/services/github.init.js` failed only the proxy test (0 CONNECTs).
    - Three scanner mutants (no escape scan, skip NUL files, lossy UTF-8) each failed exactly their own test.
  - `lint:unicode:dist`: 30 files, 0 findings.
  - `npm ls https-proxy-agent --omit=dev` is empty.
  - VSIX built with vsce 4.0.0 (43 files): no https-proxy-agent, `.codex`, `eslint-rules`, `scripts`, `node_modules` or tests. The manifest keeps onStartupFinished, 8 commands, 3 menus and 11 settings. The release-step scan of the unpacked VSIX finds nothing.
  - `npm audit --audit-level=high`: 0 vulnerabilities. Age check: PASS (347 packages).
  - actionlint: clean.
  - Commit trees, built in separate `GIT_INDEX_FILE`s and checked out to scratch: tree1 and tree2 both pass tsc and eslint; `test:unit` gives 503 for tree1 and 522 for tree2.
    - 7 of the gap to 529 are a stale `out/utils/__tests__/dependencyAnalyzer.test.js` in the working tree.
- Learning:
  - rules.md: new [proxy], [unicode-scan] and [tool-escapes]; [commit-scope] updated with LF blobs and per-commit index files.
  - Building blobs with a latin1 read and a utf8 write double-encoded every non-ASCII line. `git diff --stat HEAD <tree>` caught it (44 changed lines instead of 6).
- Residual risk:
  - VS Code builds without the fetch patch (or with `http.fetchAdditionalSupport` off) send GitHub requests directly, as they already did.
  - The scanner may flag ZWJ or LRM/RLM in future i18n strings.
  - File names are not scanned.
  - The ESLint rule covers `src` only.
- Verifier iteration 1 (rubric `.claude/goal-loop/issue8-proxy-unicode/rubric.md`): C1 and C3–C10 passed. C2 failed.
  - Cause: the rubric's own grep (`http\.proxy|agent:`, case-insensitive) matched the doc comment and `userAgent:`, not a transport or a log line.
  - Fix: the pattern now targets the real risks: reading `getConfiguration('http')`, a standalone `agent:`, `fetch:` or `request: {` option, and the old log text.
  - Check: the narrowed pattern flags HEAD's 5 offending lines (import, settings read, log, `request: {`, `agent:`) and prints nothing for the new tree.
- Commits: b75f392 (proxy client, dependency removal, Workspace Trust); the invisible-Unicode scan and this entry are in the commit that follows it.
