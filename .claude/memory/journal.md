# Journal

## 2026-10-03 — Default model → gpt-6-luna; codebase review (no Issue)

- Symptom/request: switch the default OpenAI model to `gpt-6-luna` and review the codebase for defects.
- Root cause (found while switching): `reasoningEffort: none` was implemented by omitting `reasoning_effort`. That only meant "no reasoning" while the model default was `none`; `gpt-6-luna` defaults to `medium`, so the setting would have silently become medium.
- Fix: all four operations in `src/services/openaiModels.ts` route to `gpt-6-luna`; `openai.completion.ts` now sends `none` explicitly (cast at the SDK boundary because openai 4.85.4 types lack `none`). Tests, eval harness (baseline `gpt-5.6-luna` vs `gpt-6-luna`), README/ARCHITECTURE/CHANGELOG/CLAUDE.md updated.
- Verification: `npm run compile:test` OK, `npm run lint:ci` OK, `npm run test:unit` 415 passing / 0 failing; routing property + gateway + completion tests 16 passing via direct mocha (property test is excluded from the unit runner).
- Learning: when changing models, re-check every "omit the field" default — API defaults differ per model (gpt-6-luna: reasoning_effort default `medium`; supports none/low/medium/high/xhigh/max).
- Review highlights (not fixed): issue preview Esc-on-modify creates the issue (`src/commands/issue.previewFlow.ts:122`); `sk-proj-` keys containing `-`/`_` evade secret detection (`src/utils/secretDetection.ts:27`); neon regex takes ~2.6 s on 340 KB (`secretDetection.ts:166`); GitHub repo names with dots fail to parse (`src/services/github.init.ts:39`); invalid `openaiBaseUrl` breaks every `BaseService` via `serviceConfig.ts:15`.

