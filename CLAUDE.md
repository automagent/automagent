# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Automagent — an open standard for defining AI agents via `agent.yaml`. This monorepo contains:
- `packages/schema` — JSON Schema, TypeScript types, Ajv validator (`@automagent/schema`)
- `packages/cli` — Reference CLI (`@automagent/cli`)

Both packages are ESM-only, TypeScript strict mode, target ES2022, module NodeNext. Built with tsup, tested with vitest.

## Commands

```bash
npm install                              # Install all workspace dependencies
npm run build                            # Build all packages (schema must build before cli)
npm run test                             # Run all tests
npm run lint                             # Type-check all packages

npm run build --workspace=packages/schema   # Build just schema
npm run test --workspace=packages/cli       # Test just CLI
npx vitest run packages/cli/src/commands/__tests__/commands.test.ts  # Single test file
npx vitest run -t "test name pattern"       # Filter by test name
```

## Architecture

### Schema package (`packages/schema`)

Two JSON schemas are the source of truth:
- `src/v1.schema.json` — single agent definitions (`agent.yaml`)
- `src/compose.schema.json` — multi-agent compositions (`agent-compose.yaml`)

TypeScript types in `src/index.ts` (`AgentDefinition`, `ComposeDefinition`, `ModelConfig`, etc.) are **hand-written to match** the schemas — they are not generated. Exports `validate()` and `validateCompose()` (Ajv-based), plus `NAME_PATTERN` and `NAME_MAX_LENGTH` constants.

The `fixtures` entry point (`@automagent/schema/fixtures`) provides shared test data used by both packages.

### CLI package (`packages/cli`)

Each command is a separate module in `src/commands/` registered in `src/index.ts`. Commands: `init`, `validate`, `run`, `import`, `push`, `pull`, `search`, `diff`. The `login` command is a stub (registry auth not yet implemented).

Key subsystems:
- **Validation pipeline** (`src/commands/validate.ts`): JSON schema check → model pinning warning → secret detection (API key patterns + high-entropy base64) → context file existence
- **Provider abstraction** (`src/runtime/agent-runner.ts`): Auto-detects from model name (`claude-*` → Anthropic, `gpt-*` → OpenAI). SDKs are optional peer deps, dynamically imported
- **Framework importers** (`src/importers/`): CrewAI and OpenAI Assistants → automagent YAML. Unmapped fields go to `extensions.<framework>`. LangChain importer exists but is incomplete
- **Registry commands** (`push`, `pull`, `search`, `diff`): Talk to a registry API at `http://localhost:3000` by default (configurable via `--registry`)

### CLI-Schema coupling
- CLI imports `validate`, `AgentDefinition`, `ModelConfig`, `ToolDefinition`, `ValidationResult` from schema
- `init` generates YAML that must pass schema validation
- `import` produces output that must conform to the schema
- `run` destructures AgentDefinition fields for provider dispatch

### Build order
Schema must build before CLI. The root build script enforces this: `npm run build -w packages/schema && npm run build -w packages/cli`.

## Conventions

**Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.

**Schema changes** to `v1.schema.json` or `compose.schema.json` require:
1. Corresponding updates to the hand-written TypeScript types in `packages/schema/src/index.ts`
2. New or updated test cases
3. Full build + test pass (`npm run build && npm run test`)

**Versioning:** Both packages follow semver independently. During 0.x, minor bumps may break backward compatibility. Adding optional fields = minor bump. Adding required fields or changing types = major bump. See `VERSIONING.md` for full policy.
