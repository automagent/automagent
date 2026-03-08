# Contributing to Automagent

## Development Setup

```bash
git clone https://github.com/automagent/automagent.git
cd automagent
npm install
npm run build
npm run test
```

## Project Structure

| Package | Path | Description |
|---------|------|-------------|
| `@automagent/schema` | `packages/schema` | JSON Schema, TypeScript types, Ajv validator |
| `@automagent/cli` | `packages/cli` | Reference CLI: init, validate, run, import |
| `@automagent/registry` | `packages/registry` | Agent registry (planned) |

**Build order:** Schema must build before CLI and registry. The root build script enforces this.

## Running Tests

```bash
# All packages
npm run test

# Single package
npm run test --workspace=packages/schema
npm run test --workspace=packages/cli

# Single test file
npx vitest run packages/cli/src/commands/__tests__/commands.test.ts

# Filter by test name
npx vitest run -t "test name pattern"
```

## Making Changes

1. Branch from `main`.
2. Make your changes. Add or update tests as needed.
3. Build and test:
   ```bash
   npm run build
   npm run test
   npm run lint
   ```
4. Submit a pull request against `main`.

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `chore:` maintenance, dependencies
- `refactor:` code change that neither fixes a bug nor adds a feature
- `test:` adding or updating tests

## Schema Changes

Changes to `packages/schema/src/v1.schema.json` require:

1. Corresponding updates to TypeScript types in `packages/schema/src/index.ts`.
2. New or updated test cases covering the schema change.
3. Verification that the CLI still builds and passes tests (`npm run build && npm run test`).

## Questions

Open a [GitHub issue](https://github.com/automagent/automagent/issues).
