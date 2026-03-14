# Changelog

All notable changes to the Automagent monorepo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

See [VERSIONING.md](./VERSIONING.md) for the complete versioning and release policy.

## [Unreleased]

---

## [0.4.0] - 2026-03-14

### Schema (`@automagent/schema`) - 0.3.0

#### Added
- `Assertion` type with required `type` field
- `sse` transport type for MCP server config
- 30 new schema tests (version semver, apiVersion, ContextSource, Trigger, MCP transport, Compose Workflow, Assertion)

#### Changed
- **Breaking:** `version` field now requires valid semver format (`1.0.0`, `1.0.0-beta.1`)
- **Breaking:** `apiVersion` restricted to `enum: ["v1"]`
- **Breaking:** `ContextSource` requires at least one of `file`, `url`, or `agent`
- **Breaking:** `Trigger` requires at least `event` or `schedule`
- **Breaking:** `McpServerConfig` validates transport-specific fields (`stdio` requires `command`, `sse`/`streamable-http` requires `url`)
- **Breaking:** Compose `Workflow` requires `type` or `steps`
- **Breaking:** `evaluation.assertions` items require `type` field
- Removed fixtures re-export from main entry point (use `@automagent/schema/fixtures`)

### CLI (`automagent`) - 0.4.0

#### Added
- `unpublish` command — remove agents from the hub
- `versions` command — list published versions of an agent
- `whoami --check` — validate token against the hub
- `--json` flag on `search` and `versions` for scripting/CI output
- `--insecure` flag on all hub commands to allow HTTP connections
- `--limit` and `--page` pagination options on `search`
- Pull count display in search results
- `HubClient` shared HTTP client with retry logic (502/503/504 with exponential backoff)
- `User-Agent: automagent-cli/<version>` header on all hub API requests
- Context window management with `trimMessages()` (keeps first + recent messages, caps at 100)
- Context-length-exceeded error detection with actionable message
- API error classification (auth, rate-limit, billing, context, network) with suggestions
- PKCE (RFC 7636) support in OAuth login flow
- CSRF state parameter validation on login callback
- Token expiration tracking (`expiresAt` field in credentials)
- Runtime shape validation on pull responses
- Model pinning check now handles `ModelShorthand.default`/`fallback` forms

#### Changed
- HTTPS enforced by default on hub URLs (use `--insecure` to override)
- Tool mocker now includes input in response for debugging
- Diff algorithm improved from O(n^2) to O(n) using Sets
- Renamed `registerLogin`/`registerLogout`/`registerWhoami` to `loginCommand`/`logoutCommand`/`whoamiCommand` for consistency
- Raw `console.log(chalk.*)` replaced with output.ts helpers in login and push commands
- Spinner suppressed when stdout is not a TTY (`ora` `isSilent` flag)
- `DEFAULT_IMPORT_MODEL` updated to pinned `gpt-4o-2024-11-20`
- Peer dependency ranges tightened (`@anthropic-ai/sdk >=0.39.0`, `openai >=4.77.0`)
- Hub API prefix `/v1/` centralized in `HubClient`

#### Fixed
- 12 TypeScript type errors on main (cast validated YAML to `AgentDefinition`)
- XSS in login error HTML (escapeHtml applied)
- Auth token scoping (refuse to send credentials to mismatched hub URL)
- Tool-use loop capped at 20 rounds to prevent runaway API calls
- Secret detection improved: substring scanning, new prefixes (`sk-ant-`, `ghp_`, `xoxb-`), URL/path false-positive suppression
- Unused `maxLen` variable removed from diff.ts
- Unused imports cleaned up across 6 test files

#### Security
- PKCE in OAuth login flow (code_verifier/code_challenge with S256)
- CSRF state parameter on login callback
- HTTPS enforcement on hub connections
- Token expiration checking on credential load

### Importers

#### Added
- CrewAI: tasks preserved in `extensions.crewai.tasks`
- OpenAI: `file_ids` mapped to context sources
- LangChain: memory config preserved in `extensions.langchain.memory` with warning

#### Changed
- CrewAI: model upgrade (claude-3.x to claude-4.x) now emits a warning
- LangChain: dropped memory config now emits a warning

### Infrastructure

#### Added
- CI workflow for PR validation (build, test, lint on Node.js 20 and 24)
- Lint step in publish workflow
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ROADMAP.md`
- Shared `test-helpers.ts` for CLI test files (extracted from 7 files)
- `noUnusedLocals` and `noUnusedParameters` enabled in both tsconfigs

---

## [0.3.1] - 2026-03-08

### CLI (`automagent`) - 0.3.1

#### Fixed
- CLI version read from package.json at runtime instead of hardcoded string

---

## [0.3.0] - 2026-03-08

### CLI (`automagent`) - 0.3.0

#### Added
- `export` command — convert agent.yaml to IDE-native config files
- `sync` command — export to all IDE targets at once
- `login` / `logout` / `whoami` — GitHub OAuth authentication
- IDE exporters: Claude Code (CLAUDE.md), Cursor (.cursor/rules), Copilot (.github/copilot-instructions.md)
- IDE importers: Claude Code, Cursor, Copilot formats to automagent YAML
- `init --target` — generate agent.yaml and export in one step

---

## [0.2.0] - 2026-03-05

### Schema (`@automagent/schema`) - 0.2.0

#### Changed
- `model` field is now optional on `AgentDefinition` (only `name` + `description` required)

---

## [0.1.0] - 2026-02-28

Initial release of the Automagent monorepo.

### Schema (`@automagent/schema`) - 0.1.0

#### Added
- JSON Schema definitions for agent specifications (`v1.schema.json`)
- JSON Schema for multi-agent compositions (`compose.schema.json`)
- Hand-written TypeScript types (`AgentDefinition`, `ComposeDefinition`, `ModelConfig`, `ToolDefinition`, etc.)
- Ajv-based validation (`validate()`, `validateCompose()`)
- `NAME_PATTERN` and `NAME_MAX_LENGTH` constants
- `fixtures` export for shared test data

### CLI (`automagent`) - 0.1.0

#### Added
- Commands: `init`, `validate`, `run`, `import`, `push`, `pull`, `search`, `diff`
- Validation pipeline (schema, model pinning, secret detection, context files)
- Provider auto-detection (Anthropic/OpenAI from model name)
- Framework importers (CrewAI, OpenAI Assistants, LangChain)
- Hub integration with configurable URL

---

## Version Compatibility Matrix

| automagent | @automagent/schema | Status |
|------------|-------------------|---------|
| 0.4.0 | 0.3.0 | Published |
| 0.3.1 | 0.2.0 | Published |
| 0.3.0 | 0.2.0 | Published |
| 0.2.0 | 0.2.0 | Published |
| 0.1.0 | 0.1.0 | Published |

---

## Links

- Repository: https://github.com/automagent/automagent
- Issue Tracker: https://github.com/automagent/automagent/issues
- npm - Schema: https://www.npmjs.com/package/@automagent/schema
- npm - CLI: https://www.npmjs.com/package/automagent

[Unreleased]: https://github.com/automagent/automagent/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/automagent/automagent/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/automagent/automagent/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/automagent/automagent/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/automagent/automagent/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/automagent/automagent/releases/tag/v0.1.0
