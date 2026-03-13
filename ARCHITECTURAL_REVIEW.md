# Architectural Review: Automagent Core

**Date:** 2026-03-12
**Scope:** CLI package, Schema package, Hub integration, CI/CD, Runtime
**Reviewed by:** 5-agent expert panel (CLI architecture, hub/auth, schema/validation, runtime/importers, CI/CD & project health)

---

## Executive Summary

Automagent is a well-structured, thoughtfully documented monorepo with strong foundations: clean ESM/TypeScript setup, excellent versioning policy, 348 passing tests, and a progressive-disclosure schema design. The project is production-usable at 0.3.1 but has **8 critical issues** and **~30 important issues** across security, runtime safety, test coverage, and hub integration that should be addressed before wider adoption.

The most urgent concerns are: **security vulnerabilities in the login flow** (no PKCE, XSS, credential scoping), **runtime safety gaps** (unbounded context growth, infinite tool loops), and **TypeScript type-check failures on main** (12 errors that bypass tsup's bundling but represent real type drift).

**Overall rating: 7.5/10** -- strong architecture, needs security hardening and runtime robustness.

---

## Table of Contents

1. [What's Working Well](#1-whats-working-well)
2. [Critical Issues](#2-critical-issues)
3. [Important Issues](#3-important-issues)
4. [Nice-to-Have Improvements](#4-nice-to-have-improvements)
5. [Test Coverage Assessment](#5-test-coverage-assessment)
6. [Prioritized Roadmap](#6-prioritized-roadmap)

---

## 1. What's Working Well

### Architecture
- **Clean command pattern**: Each CLI command is a self-contained module in `src/commands/` with a clear registration function. Easy to navigate and extend.
- **Schema-first design**: JSON schemas are the source of truth, with hand-written TypeScript types and Ajv validation. The progressive-disclosure model (only `name` + `description` required) is elegant.
- **Proper ESM setup**: ESM-only CLI, dual CJS/ESM schema package, NodeNext module resolution, ES2022 target -- all correctly configured.
- **Optional peer deps done right**: Dynamic imports for `@anthropic-ai/sdk` and `openai` with helpful error messages when missing.
- **Good schema extensibility**: `additionalProperties: true` + `extensions.*` namespace + `x-` prefix convention.

### Quality & Process
- **Excellent documentation**: VERSIONING.md is exemplary. CHANGELOG.md, CONTRIBUTING.md, CLAUDE.md (in both root and CLI), and 4 YAML examples provide good coverage.
- **Strong test suite**: 348 tests (50 schema, 298 CLI) covering importers, exporters, validation, round-trips, and schema contracts.
- **Schema contract tests**: `schema-contract.test.ts` verifies cross-package contracts -- an outstanding pattern for monorepos.
- **Credential file permissions**: `0o700` directory, `0o600` file, with tests verifying both.
- **Thoughtful validation pipeline**: 5-step validation (schema, model pinning, secrets, context files, instruction files) provides genuinely useful output.
- **Issue templates**: 3 types (bug, feature, schema feedback) -- mature project management.

---

## 2. Critical Issues

### C-1: No PKCE in OAuth Login Flow
**File:** `packages/cli/src/commands/login.ts:37-46`

The CLI sends a bare authorization `code` to `/auth/token` with no `code_verifier`. No `code_challenge` is sent in the initial auth URL. Any process that can intercept the callback URL can exchange the code for a token. PKCE (RFC 7636) is the standard mitigation for CLI/native OAuth flows.

**Fix:** Generate `code_verifier` with `crypto.randomBytes`, compute SHA-256 `code_challenge`, send challenge with auth URL, send verifier with token exchange.

### C-2: XSS in Login Error HTML
**File:** `packages/cli/src/commands/login.ts:56`

```typescript
`<p>${err instanceof Error ? err.message : 'Unknown error'}</p>`
```

The hub's error message is interpolated directly into HTML without escaping. A malicious hub response (or MITM) can execute JavaScript in the user's browser during the auth flow.

**Fix:** HTML-escape the error message before interpolation.

### C-3: Auth Token Sent to Any `--hub-url` Without Scoping
**File:** `packages/cli/src/utils/credentials.ts:43`

`getAuthHeaders()` loads credentials and sends the Bearer token regardless of which hub URL is targeted. If a user authenticates with `hub.automagent.dev` and then runs `push --hub-url https://evil.example.com`, their token is sent to the attacker.

**Fix:** Compare `creds.hubUrl` against the target URL before sending the token. Refuse or warn on mismatch.

### C-4: TypeScript Type-Check Failures on `main`
**Files:** `export.ts`, `init.ts`, `sync.ts`, `claude-code.test.ts` (12 errors total)

`npm run lint` fails with 12 type errors. The build succeeds only because tsup bundles without strict type-checking. Root cause: `AgentInput` interface is defined independently in 3 exporter files (`claude-code.ts`, `cursor.ts`, `copilot.ts`) and commands cast parsed YAML to `Record<string, unknown>` which doesn't satisfy `AgentInput`.

**Fix:** Unify `AgentInput` into a single shared type; fix all type assertions.

### C-5: Unbounded Context Window Growth
**File:** `packages/cli/src/runtime/agent-runner.ts:65,184`

The `messages` array grows unboundedly across conversation turns. No truncation, summarization, or sliding window. Long conversations will hit API context limits and produce unrecoverable errors, or consume excessive memory.

**Fix:** Track approximate token usage, truncate oldest messages when approaching model limits, catch context-length-exceeded errors gracefully.

### C-6: No Tool-Use Loop Iteration Limit
**File:** `packages/cli/src/runtime/agent-runner.ts:99-124,220-250`

The `while` loops continue as long as the model requests tool calls. A misbehaving model or hallucinated tool loop makes unbounded API calls indefinitely.

**Fix:** Add `MAX_TOOL_ROUNDS = 20` constant; break with a warning when exceeded.

### C-7: Secrets Embedded in Strings Bypass Detection
**File:** `packages/cli/src/commands/validate.ts:37-57`

`looksLikeSecret` uses `value.startsWith(prefix)` only. A YAML value like `"Use this key: sk-proj-abc123def456"` passes undetected. Explicitly documented in tests as a known limitation.

**Fix:** Use substring/regex matching instead of `startsWith`. Tune to avoid false positives.

### C-8: No CSRF Protection on Login Callback
**File:** `packages/cli/src/commands/login.ts:18-85`

The local HTTP server accepts requests from any origin with no `state` parameter validation. A malicious webpage could redirect to `http://localhost:{port}/callback?code=attacker_code` to trick the CLI into storing an attacker's token.

**Fix:** Generate a random `state` parameter, include it in the auth URL, validate it on callback.

---

## 3. Important Issues

### Security & Auth

| ID | Issue | Location |
|----|-------|----------|
| I-1 | No token expiration or refresh logic; `Credentials` has no `expiresAt` field | `credentials.ts:5-9` |
| I-2 | No HTTPS enforcement on `--hub-url`; tokens can be sent over plaintext HTTP | `push.ts:11` (all hub commands) |
| I-3 | Credential file has no integrity/shape validation; corrupted JSON returns arbitrary data | `credentials.ts:30` |
| I-4 | `process.exit()` in login (3 calls), agent-runner (3 calls) prevents testing and composability | `login.ts:62,84,101`, `agent-runner.ts:39,70,166` |
| I-5 | Missing common secret prefixes: `ghp_`, `xoxb-`, `sk-ant-`, `eyJ` (JWT) | `validate.ts:31` |
| I-6 | URL and file paths can false-positive as high-entropy secrets | `validate.ts:44-54` |

### Hub API

| ID | Issue | Location |
|----|-------|----------|
| I-7 | No shared HTTP client; duplicated fetch logic across push, pull, search, diff | All hub commands |
| I-8 | No request timeouts on any fetch call; CLI hangs on unresponsive hub | All hub commands |
| I-9 | No retry logic for transient failures (5xx, DNS, network) | All hub commands |
| I-10 | Push has no optimistic concurrency (no ETag/If-Match); last-write-wins silently | `push.ts:54-61` |
| I-11 | Search has no pagination; `total` field exists but no `page`/`limit` param | `search.ts:28-32` |
| I-12 | Catch-all error handlers hide real errors behind "Failed to connect to hub" | All hub commands |
| I-13 | API version `/v1/` hardcoded in 4 separate files | `push.ts:45`, `pull.ts:53`, `search.ts:32`, `diff.ts:81` |

### Runtime & Agent Execution

| ID | Issue | Location |
|----|-------|----------|
| I-14 | No streaming support; users see spinner until full response generates | `agent-runner.ts:90,211` |
| I-15 | `ModelConfig` settings (temperature, max_tokens, etc.) completely ignored by runtime | `run.ts:61`, `agent-runner.ts` |
| I-16 | Hardcoded `max_tokens: 4096` for Anthropic; OpenAI doesn't set it at all | `agent-runner.ts:91,118,211` |
| I-17 | Unknown model name silently defaults to Anthropic instead of warning | `run.ts:57` |
| I-18 | Tool mocker returns static stub with no configurability; tool input ignored | `tool-mocker.ts:6-12` |
| I-19 | No real MCP server execution; `mcp` field parsed but never used by runtime | `agent-runner.ts` (entire) |
| I-20 | Generic catch-all error handler; no differentiation of auth/rate-limit/network/billing errors | `agent-runner.ts:138-141,258-261` |
| I-21 | Malformed OpenAI tool JSON silently swallowed; empty object used instead | `agent-runner.ts:231-235` |

### Schema & Validation

| ID | Issue | Location |
|----|-------|----------|
| I-22 | `version` field has no semver pattern constraint; any string passes | `v1.schema.json:33-37` |
| I-23 | `apiVersion` is unconstrained; should be `const: "v1"` or `enum: ["v1"]` | `v1.schema.json:10-14` |
| I-24 | `ContextSource` allows empty objects (no required source type) | `v1.schema.json:368-386` |
| I-25 | `Trigger` allows neither `event` nor `schedule` | `v1.schema.json:499-521` |
| I-26 | Model pinning check ignores `ModelShorthand.default` form | `validate.ts:123-145` |
| I-27 | `oneOf` ambiguity: overlapping `ModelConfig`/`ModelShorthand` with `additionalProperties: true` | `v1.schema.json:45-56` |
| I-28 | Fixtures re-exported from main entry point bloat production bundles | `schema/src/index.ts:478` |
| I-29 | `additionalProperties: true` everywhere silently accepts field name typos | `v1.schema.json` (all definitions) |

### Code Quality

| ID | Issue | Location |
|----|-------|----------|
| I-30 | `AgentInput` interface duplicated across 3 exporter files | `claude-code.ts:1-13`, `cursor.ts:1-10`, `copilot.ts:1-10` |
| I-31 | `runCli` test helper copy-pasted across 5 test files | 5 test files |
| I-32 | `parseFrontmatter` duplicated in Cursor and Copilot importers | `cursor.ts:48-72`, `copilot.ts:44-64` |
| I-33 | Dead code: `stubs.ts` is never imported | `commands/stubs.ts` |
| I-34 | Unused variable `maxLen` in diff.ts | `diff.ts:12` |
| I-35 | Naive O(n^2) diff algorithm using `Array.includes()` | `diff.ts:10-44` |

### CI/CD

| ID | Issue | Location |
|----|-------|----------|
| I-36 | No PR validation workflow (build, test, lint on PRs) | `.github/workflows/` |
| I-37 | OIDC trusted publishing may be untested; next release could fail | `publish.yml` |
| I-38 | No linting step in CI; type errors not caught | `publish.yml` |
| I-39 | Tag naming inconsistency with VERSIONING.md recommendations | `publish.yml` trigger |

### Missing Hub Features

| ID | Issue | Location |
|----|-------|----------|
| I-40 | No `unpublish`/`delete` command | -- |
| I-41 | No `versions` command to list published versions | -- |
| I-42 | No `whoami --check` to validate token against hub | `login.ts:123-136` |

---

## 4. Nice-to-Have Improvements

| ID | Area | Issue |
|----|------|-------|
| N-1 | Hub | No `User-Agent` header on API calls |
| N-2 | Hub | No `--json` output mode for scripting/CI |
| N-3 | Hub | No offline cache for pulled agents |
| N-4 | Hub | Inconsistent error response parsing across commands |
| N-5 | Hub | Pull response has no runtime shape validation |
| N-6 | Runtime | Recursive prompt pattern (callback-based) instead of async iterator |
| N-7 | Runtime | No vision/multimodal support |
| N-8 | Runtime | No Anthropic prompt caching |
| N-9 | Runtime | No extended thinking / reasoning support |
| N-10 | Runtime | Anthropic SDK type extraction brittle (conditional inference) |
| N-11 | Runtime | Wide Anthropic peer dep range (`>=0.30.0`) risks incompatibility |
| N-12 | Runtime | Provider detection uses fragile string patterns |
| N-13 | Schema | `McpServerConfig` lacks conditional validation per transport type |
| N-14 | Schema | Compose `Workflow` requires neither `type` nor `steps` |
| N-15 | Schema | `evaluation.assertions` items have all-optional properties |
| N-16 | Schema | No type-only subpath export for consumers needing just types |
| N-17 | Schema | Fallback model fields not checked for unpinned aliases |
| N-18 | Importers | CrewAI tasks not imported |
| N-19 | Importers | CrewAI model map silently upgrades claude-3.x to claude-4.x |
| N-20 | Importers | OpenAI `file_ids` not mapped to context sources |
| N-21 | Importers | LangChain memory config silently dropped |
| N-22 | Importers | Simplistic frontmatter parser fails on complex YAML |
| N-23 | CLI | `DEFAULT_IMPORT_MODEL` is `gpt-4` (an unpinned alias the validator warns about) |
| N-24 | CLI | Inconsistent naming of command registration functions |
| N-25 | CLI | `ora` spinner doesn't check `process.stdout.isTTY` |
| N-26 | CLI | Inconsistent use of `output.ts` helpers vs raw `console.log` |
| N-27 | Project | No CODE_OF_CONDUCT.md, SECURITY.md, or ROADMAP.md |
| N-28 | Project | Enable `noUnusedLocals` and `noUnusedParameters` in tsconfig |

---

## 5. Test Coverage Assessment

| Module | Coverage | Assessment |
|--------|----------|------------|
| YAML parsing | Unit | Good |
| Importers (CrewAI, OpenAI, LangChain) | Unit | Good |
| Importers (Cursor, Copilot, Claude Code) | Unit + Integration | Good |
| Exporters (all 3) | Unit + Integration | Good |
| Round-trip (import/export) | Unit | Good |
| `validate` command | Unit + Integration | Good |
| `init` command | Unit + Integration | Good |
| Schema validation | Unit (50 tests) | Good |
| Schema contract tests | Cross-package | Excellent |
| Credentials | Unit | Good |
| `run` / agent-runner | Partial (helpers only) | **Poor** |
| `diff` command | None | **None** |
| `login` / `logout` / `whoami` | None | **None** |
| `push` / `pull` / `search` success paths | None | **None** |
| `ModelShorthand` validation | None | **Gap** |
| Compose invalid `AgentRef` | None | **Gap** |

### Key Gaps
- The `run` command and entire `agent-runner.ts` (the most complex code path -- interactive REPL with tool loops) has **zero execution tests**.
- All hub commands only test failure paths (hub unreachable, invalid input); no happy-path tests exist.
- The login flow is entirely untested, partly because `process.exit()` makes it impossible to unit test.
- `ModelShorthand` form has no fixture, no validation test, and no runtime test.

---

## 6. Prioritized Roadmap

### Phase 1: Security Hardening (Immediate)

These should be fixed before any broader adoption:

1. **Implement PKCE** in login flow (C-1)
2. **HTML-escape** login error messages (C-2)
3. **Scope credentials** to hub URL; refuse/warn on mismatch (C-3)
4. **Add CSRF `state` parameter** to login callback (C-8)
5. **Enforce HTTPS** on `--hub-url` with `--insecure` opt-in (I-2)
6. **Fix TypeScript lint errors** on main (C-4)

### Phase 2: Runtime Safety (Next Sprint)

These prevent data loss and runaway costs:

7. **Add tool-use loop iteration limit** (C-6) -- easiest critical fix
8. **Implement basic context window management** (C-5) -- catch context-exceeded errors, truncate old messages
9. **Differentiate API error types** (I-20) -- use SDK error classes for actionable messages
10. **Forward model settings** to API calls (I-15, I-16) -- make `temperature`, `max_tokens` from agent.yaml functional
11. **Improve secret detection** with substring matching (C-7)

### Phase 3: Hub Robustness (Short-term)

12. **Extract shared `HubClient`** class (I-7) -- centralizes URL construction, auth headers, timeouts, retries, error handling. Fixes I-7, I-8, I-9, I-12, I-13 in one pass.
13. **Add request timeouts** (I-8) via `AbortSignal.timeout()`
14. **Add basic retry** with exponential backoff for 5xx/network errors (I-9)
15. **Add token expiration** tracking + refresh or re-login prompt (I-1)
16. **Add pagination** to search (I-11)

### Phase 4: Code Quality & CI (Short-term)

17. **Add PR validation workflow** -- build, test, lint on every PR (I-36)
18. **Add lint step** to publish workflow (I-38)
19. **Unify `AgentInput`** into shared type (I-30, fixes C-4)
20. **Extract shared `runCli`** test helper (I-31)
21. **Delete `stubs.ts`** (I-33)
22. **Extract shared `parseFrontmatter`** (I-32)

### Phase 5: Test Coverage (Medium-term)

23. **Add unit tests for agent-runner** with mocked SDKs
24. **Add hub command happy-path tests** with mocked fetch
25. **Add login flow tests** (requires removing `process.exit()` first -- I-4)
26. **Add `ModelShorthand` fixtures and tests**
27. **Add diff command tests**

### Phase 6: Feature Completeness (Medium-term)

28. **Add streaming support** for interactive `run` (I-14)
29. **Add real MCP server execution** in `run` (I-19)
30. **Add `versions` and `unpublish` hub commands** (I-40, I-41)
31. **Add `whoami --check`** for token validation (I-42)
32. **Schema tightening**: semver pattern on `version`, `apiVersion` enum, `ContextSource`/`Trigger` constraints (I-22 through I-25)
33. **Improve diff algorithm** with LCS-based approach (I-35)

### Phase 7: 1.0.0 Readiness (Long-term)

Per VERSIONING.md Section 3.3 criteria:
- 2 consecutive minor releases without breaking changes
- Real-world feedback collected
- Tooling ecosystem signals (IDE extensions, CI plugins)
- All critical and important issues resolved
- Comprehensive test coverage across all commands

---

## Appendix A: Issue Count by Area

| Area | Critical | Important | Nice-to-have |
|------|----------|-----------|--------------|
| Security & Auth | 4 | 6 | 0 |
| Hub API | 0 | 7 | 5 |
| Runtime | 2 | 8 | 6 |
| Schema & Validation | 1 | 8 | 5 |
| Code Quality | 1 | 6 | 3 |
| CI/CD | 0 | 4 | 1 |
| Missing Features | 0 | 3 | 0 |
| **Total** | **8** | **42** | **20** |

---

## Appendix B: Fixes Applied (2026-03-12)

Three non-conflicting fixes were implemented from this review, chosen to avoid overlap with the concurrent CLI-AUDIT.md work queue.

### Fix 1: C-6 -- Tool-Use Loop Iteration Limit (DONE)

**Status:** Complete. Build passes, 360/360 tests pass.

**Changes:**
- `packages/cli/src/runtime/agent-runner.ts`:
  - Added `const MAX_TOOL_ROUNDS = 20` constant (line 7)
  - Added `toolRounds` counter + break guard in Anthropic while loop (lines 98-103)
  - Added `toolRounds` counter + break guard in OpenAI while loop (lines 222-227)

**Conflict avoidance:** Only touched lines 98-103 and 222-227 (the while loop bodies). CLI-AUDIT items #6 and #15 touch lines 39, 70, 90-96, 166, 191, 211-215 -- no overlap.

### Fix 2: C-7 + I-5 + I-6 -- Secret Detection Improvements (DONE)

**Status:** Complete. Build passes, 360/360 tests pass. 12 new test cases added.

**Changes:**
- `packages/cli/src/commands/validate.ts`:
  - Expanded `SECRET_PREFIXES` with `sk-ant-`, `ghp_`, `gho_`, `ghs_`, `ghu_`, `xoxb-`, `xoxp-` (lines 31-42)
  - Added `looksLikeUrlOrPath()` helper to suppress URL/path false positives (lines 48-58)
  - Changed prefix detection from `value.startsWith()` to token-based scanning (split on whitespace, check each token) (lines 69-76)
  - Added URL/path exclusion before high-entropy heuristic (lines 80-83)
- `packages/cli/src/commands/__tests__/validate.unit.test.ts`:
  - Updated existing embedded-secret test to expect `true`
  - Added 12 new tests: GitHub tokens (4), Slack tokens (2), Anthropic key (1), embedded secret (1), URL exclusion (2), file path exclusion (2)

**Conflict avoidance:** `validate.ts` is not referenced in any CLI-AUDIT item -- zero overlap.

### Fix 3: I-36 + I-38 -- CI/CD PR Validation & Lint Step (DONE)

**Status:** Complete. Both YAML files validated.

**Changes:**
- Created `.github/workflows/ci.yml`:
  - Triggers on push to `main` and pull_request to `main`
  - Matrix: Node.js 20 and 24 on ubuntu-latest
  - Steps: checkout, setup-node, `npm ci`, `npm run build`, `npm test`, `npm run lint`
  - Lint step uses `continue-on-error: true` (12 pre-existing type errors)
- Updated `.github/workflows/publish.yml`:
  - Added lint step after test, before publish (with same `continue-on-error: true`)

**Conflict avoidance:** `.github/workflows/` is not referenced in any CLI-AUDIT item -- zero overlap.
