# Requirements Document

## Introduction

The existing property test file `src/__tests__/properties/responses-api.property.test.ts` is a mock-echo tautology: it stubs an OpenAI client that returns whatever the test handed in, then asserts the same data back, and it claims to verify a `/v1/responses` surface that production does not actually use. Production calls `openai.chat.completions.create` through the thin wrappers `requestTextCompletion` and `requestStructuredCompletion` in `src/services/openai.completion.ts`.

This spec defines the requirements for **rewriting that single test file** so it verifies the real, observable contract of the chat-completion wrappers. The redesigned suite must drive the production wrappers, intercept the outbound `chat.completions.create` call with a thin spy, and assert that the request payload and response handling match the documented reasoning-model contract (`developer` role, `reasoning_effort`, `store:false`, `json_schema` strict mode, content trimming, failure shapes). The redesign also covers retiring the obsolete `/v1/responses` mock file.

**Scope.** Test-layer changes only: a rewrite of `src/__tests__/properties/responses-api.property.test.ts` and the deletion of `src/test/mocks/responsesAPI.mock.ts`. No production code under `src/services/openai.completion.ts` or `src/services/openai.ops.ts` is to be modified by this work.

**Non-goals.** Restoring the `gpt-5.4-mini` fallback removed after CHANGELOG 2.15.0, wiring `TokenManager.OUTPUT_TOKENS` constants through to `generateCommitMessageOp` / `generatePRContentOp` / `summarizeChunkOp`, and auditing other `__tests__/properties/` files for mock-echo patterns are explicitly **out of scope** and tracked separately.

## Glossary

- **Wrapper**: One of the two production functions under test: `requestTextCompletion` and `requestStructuredCompletion` in `src/services/openai.completion.ts`.
- **Spy client**: A minimal stand-in for the `OpenAI` SDK client whose `chat.completions.create` records the first-argument payload and returns a caller-configured canned response. Injected via the `openai` field of `TextCompletionRequest` / `StructuredCompletionRequest`.
- **Captured payload**: The first positional argument observed by the spy on `chat.completions.create` — i.e. the request body that would have been sent to OpenAI.
- **Reasoning-model contract**: The invariants required by the `gpt-5.4` reasoning model — the system prompt uses `role: 'developer'`, `reasoning_effort` is forwarded as-is, `store` is `false`, and `temperature` is never sent.
- **Test suite**: The rewritten file `src/__tests__/properties/responses-api.property.test.ts`.

## Requirements

### Requirement 1: Model and reasoning-effort pass-through

**Objective:** As a maintainer of `openai.completion.ts`, I want the test suite to fail if `createCompletionParams` drops or renames the `model` or `reasoning_effort` fields, so that the wrapper cannot silently diverge from the configured user setting.

#### Acceptance Criteria

1. When `requestTextCompletion` is invoked with a `(model, reasoningEffort)` pair drawn from a `fast-check` arbitrary covering `'gpt-5.4' | 'gpt-5.4-mini' | 'gpt-5.3-codex'` crossed with `'low' | 'medium' | 'high' | undefined`, the test suite shall assert that the captured payload's `model` field strictly equals the input `model`.
2. When `requestTextCompletion` is invoked with a `(model, reasoningEffort)` pair from the same arbitrary, the test suite shall assert that the captured payload's `reasoning_effort` field strictly equals the input `reasoningEffort`, including when the input is `undefined`.
3. When `requestStructuredCompletion` is invoked with the same `(model, reasoningEffort)` arbitrary, the test suite shall assert that the captured payload's `model` and `reasoning_effort` fields propagate identically to those asserted for the text wrapper.
4. If the captured payload contains a `temperature` field, the test suite shall fail the assertion, since the reasoning-model contract forbids `temperature`.

### Requirement 2: Developer-role and `store:false` invariants

**Objective:** As a maintainer of `openai.completion.ts`, I want the test suite to lock down the load-bearing reasoning-model invariants (`role: 'developer'`, `store: false`), so that an accidental change to `'system'` role or to `store: true` is caught locally before it reaches the OpenAI API.

#### Acceptance Criteria

1. When either wrapper is invoked with arbitrary prompt strings drawn from a `fast-check` string arbitrary for `systemPrompt` and `userPrompt`, the test suite shall assert that the captured payload's `messages` array deep-equals `[{ role: 'developer', content: systemPrompt }, { role: 'user', content: userPrompt }]`.
2. If any element of the captured `messages` array carries `role: 'system'`, the test suite shall fail the assertion.
3. When either wrapper is invoked, the test suite shall assert that the captured payload's `store` field is the boolean `false` (not `undefined` and not omitted).
4. The test suite shall cover both `requestTextCompletion` and `requestStructuredCompletion` for the role and `store` invariants, since both flow through `createCompletionParams`.

### Requirement 3: Structured-output JSON schema enforcement

**Objective:** As a maintainer of the PR-generation flow in `openai.ops.ts`, I want the test suite to verify that `requestStructuredCompletion` forwards the caller's JSON schema verbatim under strict mode, so that the PR `{ title, body }` contract cannot silently degrade to free-form text.

#### Acceptance Criteria

1. When `requestStructuredCompletion` is invoked with a `schemaName` string and a `schema` object, the test suite shall assert that the captured payload's `response_format.type` strictly equals `'json_schema'`.
2. When `requestStructuredCompletion` is invoked, the test suite shall assert that the captured payload's `response_format.json_schema.strict` is the boolean `true`.
3. When `requestStructuredCompletion` is invoked with a schema drawn from a `fast-check` arbitrary covering nested object schemas, the test suite shall assert that the captured payload's `response_format.json_schema.schema` deep-equals the input `schema` object.
4. When `requestStructuredCompletion` is invoked, the test suite shall assert that the captured payload's `response_format.json_schema.name` strictly equals the input `schemaName`.
5. When `requestTextCompletion` is invoked, the test suite shall assert that the captured payload's `response_format.type` strictly equals `'text'`, confirming the two wrappers select different output modes.

### Requirement 4: Content extraction and failure shapes

**Objective:** As a maintainer of the wrappers' response-handling logic, I want the test suite to verify how the wrappers extract content from a Chat Completions response and how they react to empty or malformed content, so that downstream callers receive the documented return types.

#### Acceptance Criteria

1. When the spy returns a response whose `choices[0].message.content` is a non-empty string with surrounding whitespace, `requestTextCompletion` shall return the trimmed string, and the test suite shall assert this equality.
2. When the spy returns a response whose `choices[0].message.content` is `null`, `undefined`, an empty string, or whose `choices` array is empty, `requestTextCompletion` shall return `undefined`, and the test suite shall assert this for each of those canned shapes.
3. When the spy returns a response whose `choices[0].message.content` is a valid JSON string matching the input schema, `requestStructuredCompletion` shall return the parsed object typed as `T`, and the test suite shall assert deep equality between the returned object and the expected parsed value.
4. If the spy returns a response whose `choices[0].message.content` is a non-empty string that is not valid JSON, then `requestStructuredCompletion` shall throw, and the test suite shall assert that the call rejects.
5. When the spy returns a response whose `choices[0].message.content` is `null`, `undefined`, or empty, `requestStructuredCompletion` shall return `undefined`, and the test suite shall assert this for each of those canned shapes.

### Requirement 5: Spy-driven discipline (no HTTP, no production mutation)

**Objective:** As a reviewer of the test redesign, I want the test suite to drive the real production wrappers through a thin, in-process spy with no HTTP or SDK rewiring, so that the tests exercise the actual code path and stay fast and deterministic.

#### Acceptance Criteria

1. The test suite shall import `requestTextCompletion` and `requestStructuredCompletion` from `src/services/openai.completion.ts` as the system under test, and shall not duplicate or re-implement their bodies.
2. The test suite shall provide the OpenAI client by setting the `openai` field of `TextCompletionRequest` / `StructuredCompletionRequest` to a minimal object whose `chat.completions.create` is an in-process spy returning a configurable canned response.
3. The test suite shall not perform any network I/O, shall not require `OPENAI_API_KEY`, and shall run under the standalone Mocha runner used by `npm run test:unit`.
4. The test suite shall not modify any file under `src/services/` or `src/constants/`; the redesign is confined to the test layer.
5. Where the existing file contains property declarations that are mock-echo tautologies (the `/v1/responses` endpoint property, the `gpt-5.4` model echo, and the standalone reasoning-effort echo), the redesigned suite shall remove those declarations rather than port them.

### Requirement 6: Retirement of the obsolete Responses API mock

**Objective:** As a maintainer of the test tree, I want the obsolete `/v1/responses` mock to be deleted alongside the rewrite, so that no remaining test fixture suggests production uses an endpoint it does not.

#### Acceptance Criteria

1. When the redesign lands, the test suite shall no longer import from `src/test/mocks/responsesAPI.mock.ts`.
2. The redesign shall delete the file `src/test/mocks/responsesAPI.mock.ts` from the repository.
3. The redesign shall verify that no other file under `src/` references `responsesAPI.mock`; if any such import is found, the redesign shall either remove the import or escalate the discovery as a separate finding before deleting the mock.
4. The redesigned `responses-api.property.test.ts` shall carry the `**Feature: responses-api-test-redesign, Property N: <desc>**` comment header pattern used by the rest of `src/__tests__/properties/`, pointing at this spec.

## Non-Goals

The following items are deliberately excluded from this spec and tracked as separate work:

- **`gpt-5.4-mini` fallback restoration.** The fallback behavior present per CHANGELOG 2.15.0 is no longer in `openai.completion.ts`. Whether to restore it is a separate product/engineering decision and is not a prerequisite for this test rewrite.
- **`TokenManager.OUTPUT_TOKENS` wiring.** The constants `OUTPUT_TOKENS.COMMIT` / `.SUMMARY` / `.PR` / `.ISSUE` are not currently wired through `generateCommitMessageOp` (which sends a hard-coded `max_completion_tokens: 5000`). Auditing and wiring those constants through is a separate task.
- **Audit of other property tests for mock-echo patterns.** Whether other files under `src/__tests__/properties/` exhibit the same tautology shape is a separate audit; this spec covers only `responses-api.property.test.ts`.
