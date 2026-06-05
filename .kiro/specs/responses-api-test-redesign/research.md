# Research: `responses-api.property.test.ts` Redesign

> **Status**: research / proposal only. No requirements or design yet —
> when this work proceeds, run `/kiro:spec-requirements` first.

## Problem

`src/__tests__/properties/responses-api.property.test.ts` is a mock-echo
tautology: it stubs an OpenAI client returning whatever the test handed
it, then asserts the same data back. The tests pass by construction and
do not detect any real production regression in the wrapper.

Worse, the test claims to verify "all AI calls hit `/v1/responses`" — but
production actually calls `openai.chat.completions.create(...)` (Chat
Completions, not the Responses API). Even a faithful mock of `/v1/responses`
would lock down the wrong API surface.

## Files inspected

- `src/__tests__/properties/responses-api.property.test.ts`
- `src/test/mocks/responsesAPI.mock.ts`
- `src/services/openai.completion.ts`
- `src/services/openai.ops.ts`
- `src/services/openaiService.ts`
- `src/services/tokenManager.ts`

## Per-property verdict

| Property | Claims to verify | Actually asserts | Verdict |
|---|---|---|---|
| P1 (endpoint) | All AI calls hit `/v1/responses` | Mock hard-codes `endpoint`; test reads back the hard-code | **Tautology** — claim is also wrong (prod uses chat completions) |
| P1 (model) | All AI calls use `gpt-5.4` | Test sets `request.model='gpt-5.4'`; mock stores; test asserts the stored value | **Tautology** |
| P5 (reasoning effort) | All AI calls carry `reasoning.effort:'low'` | Test sets it; mock stores; test reads back | **Tautology** |
| P9–P12 (output tokens) | Prod allocates 4000/500/8000/12000 tokens for the four flows | Reads four constants on `TokenManager.OUTPUT_TOKENS` and equates them to literals | **Partially real** — catches constant edits, but not whether those constants are wired through. `generateCommitMessageOp` actually sends `max_completion_tokens: 5000`, not the 4000 constant — i.e. the constants are not load-bearing here |
| `validateAllocation` | Documented inequality holds | Re-derives `total <= CONTEXT_LIMIT` over `fc.integer` range | **Real** — the one genuine property in the file |

## Redesign sketch

Replace the file with tests that exercise the actual wrapper
(`requestTextCompletion` / `requestStructuredCompletion`) by injecting a
thin spy as `openai.chat.completions.create`. The spy is **not** the
system under test; the wrapper is.

### 1. Reasoning-effort & model pass-through (real)

Fast-check `(model, effort)` pairs over
`('gpt-5.4' | 'gpt-5.4-mini' | 'gpt-5.3-codex') × ('low' | 'medium' | 'high' | undefined)`.
Assert the spy's first-arg payload has `model === input` and
`reasoning_effort === input` byte-for-byte. Catches `createCompletionParams`
dropping or renaming fields.

### 2. Role + `store:false` invariants (real)

For any prompt strings, assert the payload `messages` is
`[{role:'developer',content:sys},{role:'user',content:user}]`
(never `'system'`) and `store === false`. This is the load-bearing
reasoning-model contract — wrong role and the request fails server-side.

### 3. Structured-output enforcement (real)

Call `requestStructuredCompletion({schemaName, schema})`. Assert
`response_format.type === 'json_schema'`,
`json_schema.strict === true`, and `json_schema.schema` deep-equals the
input schema. Then fast-check schema arbitraries.

### 4. Content extraction & failure shapes (real)

Feed the spy canned `choices[0].message.content` values (padded strings,
`null`, `undefined`, malformed JSON for structured). Assert: text path
trims and returns string, returns `undefined` when content is empty;
structured path returns parsed `T` or throws on bad JSON.

### Disposition of existing properties

- **Delete outright**: P1 (endpoint), P1 (model), P5 — three mock-echo
  loops asserting nothing about prod.
- **Rewrite**: P9–P12 — collapse into a single property that calls each
  op (`generateCommitMessageOp`, `generatePRContentOp`, `summarizeChunkOp`)
  through a spy and asserts the `max_completion_tokens` actually sent
  equals the documented allocation. This will catch the current drift
  (commit op sends 5000, not the 4000 constant).
- **Keep**: the `validateAllocation` property.

## Required infrastructure changes

- A minimal `MockOpenAIClient` whose `chat.completions.create` is a
  sinon-style spy returning a configurable canned response — injected as
  the `openai` field of `TextCompletionRequest` / `StructuredCompletionRequest`.
  No HTTP needed.
- One recorded Chat Completions response fixture
  (`{id, choices:[{message:{content}}], usage}`) so extraction tests
  have a realistic shape.
- **Not needed**: a fault injector, an HTTP-level mock, or a
  `/v1/responses` mock. The wrapper has no retry/fallback/HTTP-status
  branching today; "fallback to gpt-5.4-mini on 429/500" cannot be
  tested without first re-adding that behaviour to
  `openai.completion.ts` (it was present per CHANGELOG 2.15.0 but is no
  longer in code — separate question).
- **Delete after redesign**: `src/test/mocks/responsesAPI.mock.ts` —
  nothing else references it.

## Open questions for the next phase

1. Is the gpt-5.4-mini fallback (CHANGELOG 2.15.0) intentionally removed,
   or is its absence a regression? `src/services/__tests__/completion.test.ts`
   no longer covers it. **Audit before writing requirements.**
2. Should the `OUTPUT_TOKENS` constants on `TokenManager` be deleted or
   actually wired through `generateCommitMessageOp` etc.? Right now
   they're untethered.
3. Are there other "mock-echo" patterns elsewhere in `__tests__/properties/`
   that should be audited at the same time?

## Estimated effort

- Rewrite: ~1 day (1 wrapper spy fixture + 4 property tests + delete
  obsolete file)
- Wire `OUTPUT_TOKENS` constants through (if desired): separate small task
- gpt-5.4-mini fallback audit + decision: separate small task
