# CLI Audit — 2026-03-12

Audit of `packages/cli/`. All file paths are relative to `packages/cli/src/`.

---

## How to use this document

Each finding has a severity, the exact files and lines to change, what's wrong, and step-by-step instructions. Work top-down by severity. After fixing a batch, run `npm run build && npm test` from the repo root to verify.

---

## CRITICAL

### 1. Empty YAML causes null dereference in multiple commands

**What's wrong:** `parseYamlFile()` in `utils/yaml.ts` returns `{ data: null, error: null }` for empty YAML files. Several commands only check `if (parseError)` then pass `data` directly to `validate()`, which crashes on null input.

**Files to change:**
- `commands/run.ts:108-116`
- `commands/push.ts:25-33`
- `commands/sync.ts:33-41`
- `commands/export.ts:37-49`

**How to fix:** In each file, after the existing `if (parseError)` block, add a null/type guard before calling `validate()`:

```typescript
if (!data || typeof data !== 'object') {
  error('agent.yaml is empty or not a valid YAML object.');
  process.exitCode = 1;
  return;
}
```

**Verify:** Create an empty `agent.yaml` file and run each command against it. Should show the error message, not a stack trace.

---

### 2. XSS in login callback error page

**What's wrong:** When the token exchange fails, the hub's error message is interpolated into HTML without escaping. A malicious hub (via `--hub-url`) can inject `<script>` tags.

**File to change:** `commands/login.ts:56`

**Current code:**
```html
<p>${err instanceof Error ? err.message : 'Unknown error'}</p>
```

**How to fix:** Add an escape helper at the top of the file:

```typescript
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

Then use it in the template:
```html
<p>${escapeHtml(err instanceof Error ? err.message : 'Unknown error')}</p>
```

---

## HIGH

### 3. Auth token sent to arbitrary hub URLs

**What's wrong:** Every hub command accepts `--hub-url <url>`. The `getAuthHeaders()` function in `utils/credentials.ts` attaches the stored Bearer token to whatever URL is provided. If an attacker controls `--hub-url`, they receive the token.

**Files to change:**
- `utils/credentials.ts` — modify `getAuthHeaders()` to accept a `targetUrl` parameter
- `commands/push.ts:54`, `commands/pull.ts:56`, `commands/search.ts:35`, `commands/diff.ts:86` — pass `hubUrl` to `getAuthHeaders()`

**How to fix:**
1. In `credentials.ts`, change `getAuthHeaders()` to accept `targetHubUrl: string`.
2. Compare `targetHubUrl` against the stored `creds.hubUrl`. If they differ, return empty headers and print a warning: `warn('Hub URL does not match your login. Run "automagent login --hub-url <url>" to authenticate.')`.
3. Update all four callers to pass `opts.hubUrl`.

---

### 4. No CSRF protection on OAuth login flow

**What's wrong:** The local OAuth callback server accepts any `code` parameter with no verification that it came from the flow the CLI initiated. No OAuth `state` parameter is used.

**File to change:** `commands/login.ts`

**How to fix:**
1. Before starting the server, generate a random state: `const state = crypto.randomBytes(16).toString('hex');`
2. Append it to the auth URL: `const authUrl = \`${hubUrl}/auth/github?cli_port=${port}&state=${state}\`;`
3. In the callback handler, verify: `if (url.searchParams.get('state') !== state) { res.writeHead(400); res.end('Invalid state'); return; }`
4. The hub already passes `state` through the OAuth flow (it's embedded in the GitHub OAuth state parameter), so the hub side needs to forward `state` back in the redirect to `localhost`. Check `hub/packages/hub-backend/src/routes/auth.ts` — the `statePayload` already encodes `cli_port`. Add the CLI's `state` value to the redirect: `?code=${authCode}&state=${cliState}`.

---

### 5. Path traversal via `instructions.system.file`

**What's wrong:** The `resolveInstructions()` function reads files from paths specified in agent YAML. A malicious pulled agent can read arbitrary files: `instructions: { system: { file: "../../../../etc/passwd" } }`.

**File to change:** `commands/run.ts:77-83`

**How to fix:** After resolving the path, verify it stays within the agent directory:

```typescript
const resolvedPath = yamlDir ? resolve(yamlDir, filePath) : resolve(filePath);
const agentRoot = yamlDir ?? process.cwd();
if (!resolvedPath.startsWith(resolve(agentRoot) + '/') && resolvedPath !== resolve(agentRoot)) {
  throw new Error(`Instruction file path escapes agent directory: ${filePath}`);
}
```

---

### 6. `process.exit()` prevents cleanup and breaks testability

**What's wrong:** Most commands correctly use `process.exitCode = 1; return;`. But `agent-runner.ts` and `login.ts` call `process.exit()` directly, which kills the process immediately (skipping pending I/O, finally blocks, and making the code impossible to test).

**Files to change:**
- `runtime/agent-runner.ts:39,70,166,191`
- `commands/login.ts:62,84,100`

**How to fix for agent-runner.ts:**
- Lines 39 and 166 (missing SDK): Instead of `process.exit(1)`, throw an error. The caller in `run.ts` should catch it: `try { await runAgent(config); } catch (err) { error(err.message); process.exitCode = 1; }`.
- Lines 70 and 191 (readline close): Replace `process.exit(0)` with `process.exitCode = 0; rl.close();`.

**How to fix for login.ts:**
- Line 62 (`process.exit(0)` on success): Replace with `server.close(); process.exitCode = 0;`.
- Line 84 (`process.exit(1)` on failure): Replace with `server.close(); process.exitCode = 1;`.
- Line 100 (`process.exit(1)` on timeout): Replace with `server.close(); process.exitCode = 1;`.

---

### 7. OAuth callback binds to all network interfaces

**What's wrong:** `server.listen(0)` binds to `0.0.0.0`. Any device on the local network can hit the callback.

**File to change:** `commands/login.ts:88`

**How to fix:** Change:
```typescript
server.listen(0, () => {
```
to:
```typescript
server.listen(0, '127.0.0.1', () => {
```

---

### 8. Version query parameter not URL-encoded

**What's wrong:** The `version` value from `parseAgentRef` is interpolated into URLs without encoding. Input like `1.0&admin=true` injects extra query parameters.

**Files to change:**
- `commands/pull.ts:53`
- `commands/diff.ts:81`

**How to fix:** In both files, change:
```typescript
`?version=${parsed.version}`
```
to:
```typescript
`?version=${encodeURIComponent(parsed.version)}`
```

---

### 9. No HTTPS enforcement for hub URL

**What's wrong:** `--hub-url http://example.com` sends the Bearer token in cleartext. No warning is shown.

**Files to change:** All hub commands (`push.ts`, `pull.ts`, `search.ts`, `diff.ts`, `login.ts`)

**How to fix:** Add a shared check in `utils/credentials.ts` or a helper:

```typescript
export function warnIfInsecure(url: string): void {
  if (url.startsWith('http://') && !url.startsWith('http://localhost')) {
    warn('Using insecure HTTP. Auth tokens will be sent in cleartext.');
  }
}
```

Call it at the start of each hub command's action handler.

---

### 10. Node engine mismatch

**What's wrong:** `package.json` declares `"node": ">=18"` but the `open` package (v11) requires Node >= 20. Users on Node 18-19 crash on `automagent login`.

**File to change:** `package.json:50`

**How to fix:** Change `"node": ">=18"` to `"node": ">=20"`. Also update the root `package.json` to match.

---

## MEDIUM

### 11. No `--json` output for CI/scripting

**What's wrong:** No command supports structured output. CI pipelines can't parse results.

**How to fix:** Add a `--json` flag to `validate`, `search`, and `whoami` first. When `--json` is set, output a JSON object to stdout instead of formatted text. Example for validate:
```json
{ "valid": true, "errors": [], "warnings": ["Model alias 'gpt-4' is not pinned"] }
```

---

### 12. Network error messages say "docker compose up" for production hub

**What's wrong:** All hub commands show `Is the hub running? Start it with: docker compose up` when the network fails — misleading for the production hub.

**Files to change:** `commands/push.ts:73`, `commands/pull.ts:80`, `commands/search.ts:65`, `commands/diff.ts:106`

**How to fix:** Check the hub URL:
```typescript
const hint = hubUrl === DEFAULT_HUB
  ? 'Check your internet connection.'
  : `Is the hub running at ${hubUrl}?`;
error(`Failed to connect to hub. ${hint}`);
```

---

### 13. Hub commands swallow error details

**What's wrong:** All hub `catch` blocks discard the error: `catch { error('Failed...') }`. DNS errors, TLS errors, and timeouts all show the same message.

**Files to change:** `commands/push.ts:71`, `commands/pull.ts:78`, `commands/search.ts:63`, `commands/diff.ts:104`

**How to fix:** Capture the error and include its message:
```typescript
} catch (err) {
  error(`Failed to connect to hub: ${err instanceof Error ? err.message : err}`);
```

---

### 14. No fetch timeout on hub API calls

**What's wrong:** `fetch()` has no timeout. If the hub drops packets, the CLI hangs forever.

**Files to change:** Every `fetch()` call in `push.ts`, `pull.ts`, `search.ts`, `diff.ts`, `login.ts`

**How to fix:** Add `signal: AbortSignal.timeout(30_000)` to every fetch options object:
```typescript
const res = await fetch(url, {
  ...options,
  signal: AbortSignal.timeout(30_000),
});
```

---

### 15. `run` ignores model settings from definition

**What's wrong:** `model.settings.temperature` and `model.settings.max_tokens` from the agent definition are not forwarded to the API. `max_tokens: 4096` is hardcoded in `agent-runner.ts`.

**Files to change:**
- `commands/run.ts:145-158` — extract settings from `ModelConfig` and pass to `RunConfig`
- `runtime/agent-runner.ts:7-13` — add `settings?: { temperature?: number; max_tokens?: number }` to `RunConfig`
- `runtime/agent-runner.ts:90-96,211-215` — use `config.settings?.max_tokens ?? 4096` and `config.settings?.temperature`

---

### 16. `error()` and `warn()` write to stdout, not stderr

**What's wrong:** `error()` uses `console.log()` → stdout. CLI convention is errors on stderr so stdout can be piped.

**File to change:** `utils/output.ts`

**How to fix:** Change `error()` and `warn()` to use `console.error()` instead of `console.log()`.

---

### 17. Credentials file not validated on load

**What's wrong:** `loadCredentials()` returns `JSON.parse()` output with no shape validation. Corrupted file → runtime errors elsewhere.

**File to change:** `utils/credentials.ts:28-33`

**How to fix:** After `JSON.parse`, check shape:
```typescript
const parsed = JSON.parse(raw);
if (typeof parsed?.token !== 'string' || typeof parsed?.username !== 'string' || typeof parsed?.hubUrl !== 'string') {
  return null;
}
return parsed as Credentials;
```

---

### 18. Three exporters define separate `AgentInput` types

**What's wrong:** `claude-code.ts`, `cursor.ts`, and `copilot.ts` each define their own `AgentInput` interface with different fields. As the schema evolves, these diverge.

**How to fix:** Delete all three `AgentInput` interfaces. Import `AgentDefinition` from `@automagent/schema` and use it (with optional field access) in all exporters.

---

### 19. Duplicated code across exporters

**What's wrong:** All three exporters have near-identical code for:
- Rendering `instructions` (string/object/persona) to markdown
- Rendering `guardrails` (behavioral/prohibited_actions) to markdown
- `parseFrontmatter()` in cursor.ts and copilot.ts (with subtle behavioral differences)

**How to fix:**
1. Create `utils/render-instructions.ts` with a shared `renderInstructionsMarkdown(instructions, guardrails)` function.
2. Create `utils/frontmatter.ts` with a shared `parseFrontmatter()` function.
3. Update all three exporters to use the shared utilities.

---

### 20. `push` silently defaults scope to `@local`

**What's wrong:** When `--scope` is omitted, push defaults to `@local` with no feedback. User doesn't know where their agent went.

**File to change:** `commands/push.ts:42`

**How to fix:** Either show an info message: `info('Using default scope: @local')`, or update the option description: `'Agent scope (default: @local)'`.

---

### 21. `import --format` help text is incomplete

**What's wrong:** Help says `'Force source format (crewai|openai|langchain)'` but the command also supports `claude-code`, `cursor`, `copilot`.

**File to change:** `commands/import.ts:149`

**How to fix:** Update to: `'Force source format (crewai|openai|langchain|claude-code|cursor|copilot)'`.

---

### 22. `DEFAULT_IMPORT_MODEL` triggers validation warning

**What's wrong:** `constants.ts` sets `DEFAULT_IMPORT_MODEL = 'gpt-4'`. The validate command flags `gpt-4` as an unpinned alias. So `import` → `validate` always warns.

**File to change:** `utils/constants.ts:3`

**How to fix:** Either remove the default model entirely (model is now optional), or use a pinned ID like `'gpt-4o-2024-08-06'`.

---

### 23. Inconsistent YAML lineWidth across commands

**What's wrong:** `init` uses `lineWidth: 0` (unlimited). `import`, `pull`, `diff` use `lineWidth: 120`. The same definition formats differently depending on the command, causing false positives in `diff`.

**How to fix:** Add to `utils/constants.ts`:
```typescript
export const YAML_STRINGIFY_OPTIONS = { lineWidth: 120 };
```
Use it in all commands that serialize YAML.

---

### 24. `init --target` overwrites files without `--force`

**What's wrong:** `export` checks `--force` before overwriting. `init --target` always overwrites.

**File to change:** `commands/init.ts:163-181`

**How to fix:** Add `existsSync()` check for each target file. Skip if it exists and `--force` is not set.

---

### 25. Naive diff algorithm

**What's wrong:** `diffLines()` in `diff.ts` uses `Array.includes()` in a loop (O(n*m)), produces incorrect diffs for non-trivial edits, and has an unused `maxLen` variable.

**File to change:** `commands/diff.ts:10-44`

**How to fix:** Replace with a proper Myers diff or use the `diff` npm package. Delete the unused `maxLen` variable.

---

## LOW

### 26. No command examples in help text
Add `.addHelpText('after', ...)` with 2-3 examples per command.

### 27. No `--verbose` / `--quiet` global flags
Add to the root program in `index.ts`. `--quiet` suppresses info. `--verbose` adds debug output.

### 28. No `--dry-run` on `push`
Add `--dry-run` flag that validates and shows what would be pushed without sending the request.

### 29. No grouped commands in `--help`
Group commands: Local (`init`, `validate`, `run`), Convert (`import`, `export`, `sync`), Hub (`push`, `pull`, `search`, `diff`), Auth (`login`, `logout`, `whoami`). Add "Get started: automagent init" footer.

### 30. Dead code: `stubs.ts`
Delete `commands/stubs.ts`. It's never imported.

### 31. `open` should be optional dependency
Move `open` from `dependencies` to `optionalDependencies` in `package.json`. Wrap the dynamic import in `login.ts` with a try/catch and user-friendly error.

### 32. No token expiry
Store a `createdAt` timestamp in `credentials.json`. Check age on load. Prompt re-auth after 30 days.

### 33. YAML parsing has no alias limits
In `utils/yaml.ts`, pass `maxAliasCount: 100` to the `parse()` call.

### 34. `parseYamlString` doesn't validate data is an object
After parsing, check `typeof data === 'object' && data !== null`. Return an error otherwise.

### 35. `runCli` test helper duplicated in 5 files
Extract to `__tests__/helpers.ts` and import from all test files.

### 36. Login timeout has no user feedback
Add a spinner during the 2-minute wait. Also consider `--token <token>` for headless/CI environments.

### 37. Corrupted credentials silently returns null
In `loadCredentials()`, if the file exists but fails to parse, log `warn('Credentials file is corrupted. Run "automagent login" to re-authenticate.')`.

### 38. `sync` doesn't set exit code for unknown targets
In `sync.ts`, when an unknown target is encountered, set `process.exitCode = 1`.

---

## TEST COVERAGE GAPS

Commands with **no test coverage** that need integration tests (subprocess via `runCli`):

| Command | What to test |
|---------|-------------|
| `run` | Missing file, invalid YAML, missing model + no `--model`, missing API key |
| `push` | Missing file, not logged in, successful push (mock), network error |
| `search` | Empty query, results, network error |
| `diff` | Missing file, no scope, 404 from hub, no differences, actual differences |
| `login` | Timeout, browser not opening |
| `logout` | Clears credentials, idempotent |
| `whoami` | Logged in, not logged in |

Commands with **partial coverage** that need error-path tests:

| Command | Missing tests |
|---------|--------------|
| `export` | Missing file, invalid YAML, `--force` with existing files |
| `sync` | Invalid targets, `--dry-run` |
| `pull` | Network error, 404, version not found |

---

## PRIORITY ORDER

Work through these in order. Each batch can be a single commit.

**Batch 1 — Critical security (30 min)**
1. Null guard after YAML parse (#1)
2. HTML-escape login error (#2)
3. Bind OAuth to 127.0.0.1 (#7)
4. URL-encode version param (#8)

**Batch 2 — Auth security (30 min)**
5. Validate hub URL before sending token (#3)
6. Add OAuth state parameter (#4)
7. Warn on non-HTTPS hub URL (#9)

**Batch 3 — Robustness (30 min)**
8. Path traversal guard for instruction files (#5)
9. Replace `process.exit()` with `process.exitCode` (#6)
10. Add fetch timeouts (#14)
11. Capture error details in hub catch blocks (#13)

**Batch 4 — Output correctness (15 min)**
12. Move error/warn to stderr (#16)
13. Fix network error messages (#12)
14. Validate credentials shape on load (#17)

**Batch 5 — Code quality (45 min)**
15. Unify exporter types (#18) and extract shared utilities (#19)
16. Fix DEFAULT_IMPORT_MODEL (#22)
17. Centralize YAML options (#23)
18. Delete stubs.ts (#30)
19. Fix Node engine version (#10)

**Batch 6 — UX improvements**
20. Everything in the LOW section

**Batch 7 — Test coverage**
21. Add tests per the coverage gap table
