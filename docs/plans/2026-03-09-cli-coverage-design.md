# CLI Unit Test Coverage Expansion

## Goal

Increase CLI command coverage from ~6% to 50%+ by adding direct unit tests for exported pure/near-pure functions that V8 coverage can instrument.

## Scope

| File | Functions to test | Type |
|------|-------------------|------|
| validate.ts | `looksLikeSecret()`, `collectStringValues()`, `runChecks()` | Pure + near-pure |
| import.ts | `detectFormat()`, `parseInputFile()`, `addTodoComments()` | Pure |
| pull.ts | `parseAgentRef()` | Pure |
| init.ts | `validateName()`, `buildYaml()`, `buildQuickConfig()` | Pure |
| slugify.ts | `slugify()` | Pure |

## Out of scope

- login.ts (HTTP server, browser launch — I/O heavy, low logic)
- diff.ts, search.ts, push.ts (thin fetch wrappers — covered by subprocess tests)
- output.ts (trivial chalk wrappers)
- run.ts (pure helpers already tested in schema-contract.test.ts)

## Approach

- Import functions directly into vitest process (not subprocess)
- Minimal mocking: only `fs` for file-existence checks in `runChecks()`
- Test all branching paths identified in each function
- Place tests in `packages/cli/src/commands/__tests__/`
