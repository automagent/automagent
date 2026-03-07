# Changelog

All notable changes to the Automagent monorepo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

See [VERSIONING.md](./VERSIONING.md) for the complete versioning and release policy.

## [Unreleased]

### Schema (`@automagent/schema`)

#### Added
- LangChain importer completion (pending)

### CLI (`automagent`)

#### Changed
- Renamed npm package from `@automagent/cli` to `automagent`

---

## [0.1.0] - Unreleased

Initial release of the Automagent monorepo. Both packages are functional but **not yet published to npm**.

### Schema (`@automagent/schema`)

#### Added
- JSON Schema definitions for agent specifications (`v1.schema.json`)
- JSON Schema for multi-agent compositions (`compose.schema.json`)
- Hand-written TypeScript types matching schemas
  - `AgentDefinition` - Single agent configuration
  - `ComposeDefinition` - Multi-agent composition
  - `ModelConfig` - AI model configuration
  - `ToolDefinition` - Tool specification
  - `ResourceDefinition` - Resource specification
- Ajv-based validation functions
  - `validate()` - Validates single agent definitions
  - `validateCompose()` - Validates multi-agent compositions
- Constants for name validation
  - `NAME_PATTERN` - Regex pattern for valid names
  - `NAME_MAX_LENGTH` - Maximum length for names
- `fixtures` export for shared test data

#### Technical Details
- ESM-only package targeting ES2022
- TypeScript strict mode enabled
- Built with tsup
- Tested with vitest
- Schema format: `apiVersion: v1`

### CLI (`automagent`)

#### Added
- **Core Commands:**
  - `init` - Generate new agent.yaml from template
  - `validate` - Comprehensive validation pipeline
  - `run` - Execute agent with provider auto-detection
  - `import` - Convert from CrewAI/OpenAI/LangChain formats
  - `push` - Publish agent to hub
  - `pull` - Download agent from hub
  - `search` - Search hub for agents
  - `diff` - Compare local agent with hub version
  - `login` - Authentication stub (not yet implemented)

- **Validation Pipeline:**
  - JSON schema validation
  - Model pinning warnings (non-pinned versions)
  - Secret detection (API key patterns, high-entropy base64)
  - Context file existence checks

- **Provider Support:**
  - Anthropic (Claude) SDK integration
  - OpenAI SDK integration
  - Auto-detection from model names (`claude-*`, `gpt-*`)
  - Dynamic SDK imports (peer dependencies)

- **Framework Importers:**
  - CrewAI to automagent converter
  - OpenAI Assistants to automagent converter
  - LangChain to automagent converter (incomplete)
  - Unmapped fields preserved in `extensions.<framework>`

- **Hub Integration:**
  - HTTP client for hub API (`https://hub.automagent.dev` by default)
  - Configurable hub URL via `--hub-url` flag
  - Push, pull, search, and diff operations

#### Technical Details
- ESM-only package targeting ES2022
- TypeScript strict mode enabled
- Built with tsup using Commander.js, chalk, ora, yaml
- Tested with vitest
- Optional peer dependencies: `@anthropic-ai/sdk`, `openai`

### Infrastructure

#### Added
- npm workspaces configuration
- Monorepo build pipeline
  - Schema builds before CLI (dependency order enforced)
  - Workspace-aware build, test, and lint scripts
- Development tooling
  - TypeScript configuration with strict mode
  - Vitest for testing
  - tsup for bundling
- Documentation
  - `VERSIONING.md` - Complete versioning and release policy
  - `CLAUDE.md` - Development guidance
  - README files for each package

---

## Release Notes Format

Each release entry should follow this structure:

### Schema (`@automagent/schema`) - [version]

#### Added
- New fields, types, or functions

#### Changed
- Modifications to existing behavior

#### Deprecated
- Features marked for future removal

#### Removed
- Fields, types, or functions that were removed

#### Fixed
- Bug fixes in validation or types

#### Security
- Security-related changes

### CLI (`automagent`) - [version]

Same categories as above.

---

## Version Compatibility Matrix

| automagent | @automagent/schema | Status |
|------------|-------------------|---------|
| 0.1.0 | 0.1.0 | Unreleased |

---

## Links

- Repository: https://github.com/automagent/automagent
- Issue Tracker: https://github.com/automagent/automagent/issues
- npm - Schema: https://www.npmjs.com/package/@automagent/schema
- npm - CLI: https://www.npmjs.com/package/automagent

[Unreleased]: https://github.com/automagent/automagent/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/automagent/automagent/releases/tag/v0.1.0
