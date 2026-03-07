# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Automagent — an open standard for defining AI agents via `agent.yaml`. This monorepo contains:
- `packages/schema` — JSON Schema, TypeScript types, Ajv validator (`@automagent/schema`)
- `packages/cli` — Reference CLI: init, validate, run, import (`@automagent/cli`)

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

### Schema is the source of truth
`packages/schema/src/v1.schema.json` defines all valid agent.yaml shapes. The TypeScript types in `packages/schema/src/index.ts` (AgentDefinition, ModelConfig, etc.) are hand-written to match. The CLI depends on both the validator and the types.

### CLI-Schema coupling points
- CLI imports `validate`, `AgentDefinition`, `ModelConfig`, `ToolDefinition`, `ValidationResult` from the schema
- `init` generates YAML that must pass schema validation
- `validate` wraps schema validation + additional checks (model pinning, secret detection, context files)
- `run` destructures AgentDefinition fields (model, instructions, tools) for provider dispatch
- `import` produces output that must conform to the schema
- The name pattern regex in `packages/cli/src/commands/init.ts` is duplicated from the schema

### Provider abstraction (packages/cli/src/runtime/agent-runner.ts)
Auto-detects provider from model name (claude→Anthropic, gpt→OpenAI). SDKs are optional peer dependencies, dynamically imported.

### Build order
Schema must build before CLI. The root build script enforces this.
