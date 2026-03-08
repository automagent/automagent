# Cleanup: Remove Python References & Fix Structural Issues

**Date:** 2026-03-07
**Scope:** Approach C — Python cleanup + critical npm fixes + code quality improvements

## 1. Remove Python References

Remove `.py` file handling from CLI code and docs. Leave docs/research references that describe external frameworks (factual, not our code).

**Files to modify:**
- `packages/cli/src/commands/import.ts` — remove `.py` from `detectFormat()`, `parseInputFile()`, error messages
- `packages/cli/README.md` — remove Python from examples and supported formats table

## 2. Critical npm Publish Fixes

- Add `"files": ["dist"]` to `packages/cli/package.json`
- Fix bundled-vs-external inconsistency: since tsup bundles everything, move `@automagent/schema`, `chalk`, `commander`, `ora`, `yaml` from `dependencies` to `devDependencies`
- Make build order explicit in root `package.json`: `npm run build -w packages/schema && npm run build -w packages/cli`

## 3. Code Quality Improvements

- Add `"engines": { "node": ">=18" }` to root and both package.json files
- Standardize exit strategy: replace `process.exit(1)` with `process.exitCode = 1; return;` in init.ts, validate.ts, run.ts
- Fix `buildQuickConfig` in init.ts to throw instead of calling process.exit
- Extract duplicated `SCHEMA_HEADER`/`SCHEMA_DIRECTIVE` to shared constant in utils
- Extract default model `'gpt-4'` to shared constant in importers or utils

## Out of Scope

- ESLint/Prettier setup
- vitest config / coverage thresholds
- TypeScript project references
- Importer return type improvements
- Test gap filling
- The `# TODO: Review model` smuggling pattern
