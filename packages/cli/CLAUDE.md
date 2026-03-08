# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@automagent/cli` — a CLI toolkit for the automagent agent definition standard. Defines agents in YAML, validates them against a schema, runs them interactively via Anthropic or OpenAI, and imports from CrewAI and OpenAI Assistants formats.

## Commands

```bash
npm run build          # Build with tsup (ESM, outputs to dist/)
npm run dev            # Watch mode build
npm run test           # Run vitest once
npm run test:watch     # Run vitest in watch mode
npm run lint           # Type-check with tsc --noEmit
```

Run a single test file or filter:
```bash
npx vitest run src/commands/__tests__/commands.test.ts
npx vitest run -t "test name pattern"
```

## Architecture

### CLI Command Pattern
Each command is a separate module in `src/commands/` exporting `registerCommand(program: Command): void`. Commands are registered in `src/index.ts`. The CLI binary is `automagent` (configured in package.json `bin`).

Commands: `init`, `validate`, `run`, `import` (plus Phase 2 stubs in `stubs.ts`: push, pull, login, diff).

### Provider Abstraction (`src/runtime/agent-runner.ts`)
The `run` command auto-detects provider from model name (`claude-*` → Anthropic, `gpt-*` → OpenAI). SDKs are dynamically imported as optional peer dependencies — the CLI won't crash if they're missing until `run` is invoked.

### Validation Pipeline (`src/commands/validate.ts`)
Four-step validation: JSON schema check (via `@automagent/schema`), model pinning warning, secret detection (scans all strings for API key patterns and high-entropy base64), and context file existence verification.

### Framework Importers (`src/importers/`)
Convert CrewAI and OpenAI Assistants formats to automagent YAML. Unmapped fields are preserved in `extensions.<framework>`. Schema validation runs post-import.

### Utilities
- `src/utils/output.ts` — Colored console helpers (chalk)
- `src/utils/yaml.ts` — YAML file parsing
- `src/runtime/tool-mocker.ts` — Mock tool responses for dev/testing

## Build & Module System

- ESM-only (`"type": "module"` in package.json)
- TypeScript strict mode, target ES2022, module NodeNext
- tsup bundles to `dist/index.js` with `#!/usr/bin/env node` shebang
- `@anthropic-ai/sdk` and `openai` are external (not bundled)

## Testing

All tests live in `src/commands/__tests__/commands.test.ts` using vitest. Tests cover YAML parsing, both importers, tool mocker, and CLI commands (validate, init) via subprocess integration.
