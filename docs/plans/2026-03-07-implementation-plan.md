# Phase 1 Polish + Phase 2 Registry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Phase 1 publish-readiness (docs, templates, smoke tests) and build a local registry prototype with push/pull/search using Hono + Drizzle + Postgres in Docker.

**Architecture:** Three-package npm workspace. `packages/schema` provides types + validation. `packages/cli` is the user-facing tool. `packages/registry` is a new Hono API server that stores agent definitions in Postgres via Drizzle ORM. CLI commands `push`, `pull`, and `search` call the registry HTTP API. Docker Compose runs the API + Postgres locally.

**Tech Stack:** TypeScript, Hono, Drizzle ORM, PostgreSQL 16, Docker Compose, Vitest, tsup

---

## Phase A: Phase 1 Polish

### Task 1: GitHub Issue Templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug-report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature-request.yml`
- Create: `.github/ISSUE_TEMPLATE/schema-feedback.yml`

**Step 1: Create bug report template**

```yaml
# .github/ISSUE_TEMPLATE/bug-report.yml
name: Bug Report
description: Report a bug in automagent CLI or schema
labels: ["bug"]
body:
  - type: textarea
    id: description
    attributes:
      label: What happened?
      description: A clear description of the bug.
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to reproduce
      description: Minimal steps to reproduce the behavior.
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected behavior
    validations:
      required: true
  - type: input
    id: version
    attributes:
      label: CLI version
      description: Output of `automagent --version`
    validations:
      required: true
  - type: dropdown
    id: os
    attributes:
      label: Operating system
      options:
        - macOS
        - Linux
        - Windows
    validations:
      required: true
```

**Step 2: Create feature request template**

```yaml
# .github/ISSUE_TEMPLATE/feature-request.yml
name: Feature Request
description: Suggest a new feature or improvement
labels: ["enhancement"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What problem does this solve?
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed solution
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives considered
```

**Step 3: Create schema feedback template**

```yaml
# .github/ISSUE_TEMPLATE/schema-feedback.yml
name: Schema Feedback
description: Feedback on the agent.yaml schema design
labels: ["schema"]
body:
  - type: dropdown
    id: type
    attributes:
      label: Feedback type
      options:
        - Missing field
        - Field should be required
        - Field should be optional
        - Type should change
        - New feature area
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Description
      description: Describe the schema change and your use case.
    validations:
      required: true
  - type: textarea
    id: example
    attributes:
      label: Example agent.yaml
      description: Show what the YAML would look like with your proposed change.
      render: yaml
```

**Step 4: Commit**

```bash
git add .github/ISSUE_TEMPLATE/
git commit -m "chore: add GitHub issue templates for bugs, features, and schema feedback"
```

---

### Task 2: CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

**Step 1: Write contributing guide**

```markdown
# Contributing to Automagent

Thank you for your interest in contributing to automagent!

## Development Setup

```bash
git clone https://github.com/automagent/automagent.git
cd automagent
npm install
npm run build
npm run test
```

## Project Structure

```
packages/
  schema/    # @automagent/schema — JSON Schema, types, validator
  cli/       # @automagent/cli — init, validate, run, import commands
  registry/  # @automagent/registry — local registry API server
```

## Build Order

Schema must build before CLI and registry. The root `npm run build` handles this automatically.

## Running Tests

```bash
npm run test                              # All packages
npm run test --workspace=packages/schema  # Schema only
npm run test --workspace=packages/cli     # CLI only
npm run test --workspace=packages/registry # Registry only
```

## Making Changes

1. Create a branch from `main`
2. Make your changes
3. Add or update tests
4. Run `npm run build && npm run test` to verify
5. Run `npm run lint` to type-check
6. Submit a pull request

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `chore:` maintenance (deps, CI, templates)
- `refactor:` code change that doesn't fix a bug or add a feature
- `test:` adding or updating tests

## Schema Changes

Changes to `packages/schema/src/v1.schema.json` require:

1. Corresponding update to TypeScript types in `packages/schema/src/index.ts`
2. New test cases in `packages/schema/src/index.test.ts`
3. Verification that CLI still builds and passes tests

## Questions?

Open a [GitHub issue](https://github.com/automagent/automagent/issues) or start a discussion.
```

**Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add contributing guide"
```

---

### Task 3: Package Metadata Audit

**Files:**
- Modify: `packages/schema/package.json`
- Modify: `packages/cli/package.json`
- Modify: `package.json` (root)

**Step 1: Add missing metadata to both package.json files**

Add to both `packages/schema/package.json` and `packages/cli/package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/automagent/automagent.git",
    "directory": "packages/schema"
  },
  "homepage": "https://automagent.dev",
  "bugs": {
    "url": "https://github.com/automagent/automagent/issues"
  },
  "keywords": ["ai", "agent", "yaml", "schema", "automagent"]
}
```

(Adjust `directory` to `packages/cli` for CLI package. Add `"cli"` and `"llm"` to CLI keywords.)

Add to root `package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/automagent/automagent.git"
  },
  "homepage": "https://automagent.dev",
  "license": "Apache-2.0"
}
```

**Step 2: Verify npm pack output looks correct**

Run: `cd packages/schema && npm pack --dry-run 2>&1 | head -30`
Run: `cd packages/cli && npm pack --dry-run 2>&1 | head -30`

Expected: lists of dist files only, no src or test files.

**Step 3: Commit**

```bash
git add package.json packages/schema/package.json packages/cli/package.json
git commit -m "chore: add repository, homepage, and keywords to package metadata"
```

---

### Task 4: End-to-End Smoke Test Script

**Files:**
- Create: `scripts/smoke-test.sh`

**Step 1: Write the smoke test**

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Automagent Smoke Test ==="

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

CLI="node $(pwd)/packages/cli/dist/index.js"

echo "1. Testing init --quick..."
(cd "$TMPDIR" && $CLI init --quick)
test -f "$TMPDIR/agent.yaml" || { echo "FAIL: agent.yaml not created"; exit 1; }
echo "   PASS"

echo "2. Testing validate..."
(cd "$TMPDIR" && $CLI validate)
echo "   PASS"

echo "3. Testing validate with bad file..."
echo "bad: yaml: content" > "$TMPDIR/bad.yaml"
if (cd "$TMPDIR" && $CLI validate bad.yaml 2>&1); then
  echo "FAIL: should have rejected bad.yaml"
  exit 1
fi
echo "   PASS (correctly rejected)"

echo "4. Testing import (CrewAI)..."
cat > "$TMPDIR/crew.yaml" << 'CREW'
role: Data Analyst
goal: Analyze data
backstory: Expert analyst
llm: gpt-4
CREW
(cd "$TMPDIR" && $CLI import crew.yaml --output imported.yaml --force)
test -f "$TMPDIR/imported.yaml" || { echo "FAIL: imported.yaml not created"; exit 1; }
echo "   PASS"

echo ""
echo "=== All smoke tests passed ==="
```

**Step 2: Make executable and test it**

Run: `chmod +x scripts/smoke-test.sh`
Run: `npm run build && bash scripts/smoke-test.sh`
Expected: All 4 tests pass.

**Step 3: Commit**

```bash
git add scripts/smoke-test.sh
git commit -m "test: add end-to-end smoke test script"
```

---

## Phase B: Registry Package Scaffold

### Task 5: Registry Package Init

**Files:**
- Create: `packages/registry/package.json`
- Create: `packages/registry/tsconfig.json`
- Create: `packages/registry/tsup.config.ts`
- Create: `packages/registry/src/index.ts` (minimal Hono hello world)
- Modify: `package.json` (root — add registry to workspaces)

**Step 1: Create package.json**

```json
{
  "name": "@automagent/registry",
  "version": "0.1.0",
  "description": "Local registry API server for automagent agent definitions",
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsup",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "clean": "rm -rf dist",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "@automagent/schema": "^0.1.0",
    "@hono/node-server": "^1.13.0",
    "drizzle-orm": "^0.38.0",
    "hono": "^4.7.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "drizzle-kit": "^0.30.0",
    "tsup": "^8.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "Apache-2.0"
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: ['@automagent/schema', 'postgres'],
});
```

**Step 4: Create minimal Hono server**

```typescript
// packages/registry/src/index.ts
import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT ?? 3000);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Registry listening on http://localhost:${port}`);
});
```

```typescript
// packages/registry/src/app.ts
import { Hono } from 'hono';

export const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));
```

**Step 5: Add registry to root workspaces**

In root `package.json`, change `workspaces` to:

```json
"workspaces": ["packages/schema", "packages/cli", "packages/registry"]
```

Update root build script:

```json
"build": "npm run build -w packages/schema && npm run build -w packages/cli && npm run build -w packages/registry"
```

**Step 6: Install dependencies and verify build**

Run: `npm install`
Run: `npm run build --workspace=packages/registry`

Expected: builds successfully to `packages/registry/dist/index.js`

**Step 7: Commit**

```bash
git add packages/registry/ package.json
git commit -m "feat(registry): scaffold Hono API server package"
```

---

### Task 6: Drizzle Schema + Migration

**Files:**
- Create: `packages/registry/src/db/schema.ts`
- Create: `packages/registry/src/db/index.ts`
- Create: `packages/registry/src/db/migrate.ts`
- Create: `packages/registry/drizzle.config.ts`

**Step 1: Write the failing test**

Create `packages/registry/src/db/__tests__/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { agents, agentVersions, tags } from '../schema.js';

describe('database schema', () => {
  it('agents table has required columns', () => {
    const cols = Object.keys(agents);
    expect(cols).toContain('id');
    expect(cols).toContain('name');
    expect(cols).toContain('scope');
    expect(cols).toContain('description');
    expect(cols).toContain('latestVersion');
    expect(cols).toContain('createdAt');
    expect(cols).toContain('updatedAt');
  });

  it('agentVersions table has required columns', () => {
    const cols = Object.keys(agentVersions);
    expect(cols).toContain('id');
    expect(cols).toContain('agentId');
    expect(cols).toContain('version');
    expect(cols).toContain('definition');
    expect(cols).toContain('readme');
    expect(cols).toContain('createdAt');
  });

  it('tags table has required columns', () => {
    const cols = Object.keys(tags);
    expect(cols).toContain('id');
    expect(cols).toContain('agentId');
    expect(cols).toContain('tag');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/registry/src/db/__tests__/schema.test.ts`
Expected: FAIL — cannot find `../schema.js`

**Step 3: Write the Drizzle schema**

```typescript
// packages/registry/src/db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  scope: text('scope'),
  description: text('description').notNull(),
  latestVersion: text('latest_version').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agents_scope_name_idx').on(table.scope, table.name),
]);

export const agentVersions = pgTable('agent_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  definition: jsonb('definition').notNull(),
  readme: text('readme'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agent_versions_agent_version_idx').on(table.agentId, table.version),
]);

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
}, (table) => [
  uniqueIndex('tags_agent_tag_idx').on(table.agentId, table.tag),
]);
```

**Step 4: Write db connection helper**

```typescript
// packages/registry/src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL ?? 'postgres://automagent:automagent@localhost:5432/automagent';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { schema };
```

**Step 5: Write migration runner**

```typescript
// packages/registry/src/db/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL ?? 'postgres://automagent:automagent@localhost:5432/automagent';

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete.');
  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

**Step 6: Write drizzle config**

```typescript
// packages/registry/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://automagent:automagent@localhost:5432/automagent',
  },
});
```

**Step 7: Run test to verify it passes**

Run: `npx vitest run packages/registry/src/db/__tests__/schema.test.ts`
Expected: PASS — all 3 tests

**Step 8: Commit**

```bash
git add packages/registry/src/db/ packages/registry/drizzle.config.ts
git commit -m "feat(registry): add Drizzle schema for agents, versions, and tags"
```

---

### Task 7: Docker Compose Setup

**Files:**
- Create: `docker-compose.yml` (root)
- Create: `packages/registry/Dockerfile`
- Create: `.dockerignore`

**Step 1: Create docker-compose.yml**

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: automagent
      POSTGRES_PASSWORD: automagent
      POSTGRES_DB: automagent
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U automagent"]
      interval: 5s
      timeout: 3s
      retries: 5

  registry:
    build:
      context: .
      dockerfile: packages/registry/Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://automagent:automagent@db:5432/automagent
      PORT: "3000"

volumes:
  pgdata:
```

**Step 2: Create Dockerfile**

```dockerfile
# packages/registry/Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root
COPY package.json ./
COPY packages/schema/package.json packages/schema/
COPY packages/cli/package.json packages/cli/
COPY packages/registry/package.json packages/registry/

RUN npm install

COPY packages/schema/ packages/schema/
COPY packages/registry/ packages/registry/

RUN npm run build -w packages/schema
RUN npm run build -w packages/registry

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/schema/package.json packages/schema/
COPY --from=builder /app/packages/schema/dist packages/schema/dist
COPY --from=builder /app/packages/schema/src/*.json packages/schema/src/
COPY --from=builder /app/packages/registry/package.json packages/registry/
COPY --from=builder /app/packages/registry/dist packages/registry/dist
COPY --from=builder /app/packages/registry/drizzle packages/registry/drizzle/
COPY --from=builder /app/packages/registry/src/db/migrate.ts packages/registry/src/db/migrate.ts

RUN npm install --omit=dev

EXPOSE 3000
WORKDIR /app/packages/registry
CMD ["node", "dist/index.js"]
```

**Step 3: Create .dockerignore**

```
node_modules
dist
.git
*.md
docs
```

**Step 4: Verify Docker Compose starts**

Run: `docker compose up -d db`
Run: `docker compose ps` — verify db is healthy
Run: `docker compose down`

**Step 5: Commit**

```bash
git add docker-compose.yml packages/registry/Dockerfile .dockerignore
git commit -m "feat(registry): add Docker Compose with Postgres and registry service"
```

---

### Task 8: Generate and Run Initial Migration

**Step 1: Start Postgres**

Run: `docker compose up -d db`

**Step 2: Generate migration from Drizzle schema**

Run: `cd packages/registry && npx drizzle-kit generate`

Expected: creates `packages/registry/drizzle/0000_*.sql` with CREATE TABLE statements

**Step 3: Run migration**

Run: `cd packages/registry && npx tsx src/db/migrate.ts`

Expected: "Migrations complete."

**Step 4: Verify tables exist**

Run: `docker compose exec db psql -U automagent -c '\dt'`

Expected: lists `agents`, `agent_versions`, `tags` tables

**Step 5: Commit**

```bash
git add packages/registry/drizzle/
git commit -m "feat(registry): generate initial database migration"
```

---

## Phase C: Registry API Routes

### Task 9: Health Check Route (already done in Task 5, verify with test)

**Files:**
- Create: `packages/registry/src/__tests__/health.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { app } from '../app.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
```

**Step 2: Run test**

Run: `npx vitest run packages/registry/src/__tests__/health.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/registry/src/__tests__/health.test.ts
git commit -m "test(registry): add health check route test"
```

---

### Task 10: Push Route (PUT /v1/agents/:scope/:name)

**Files:**
- Create: `packages/registry/src/routes/agents.ts`
- Modify: `packages/registry/src/app.ts`
- Create: `packages/registry/src/__tests__/agents.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/registry/src/__tests__/agents.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { app } from '../app.js';
import { db, schema } from '../db/index.js';
import { sql } from 'drizzle-orm';

// These tests require a running Postgres (docker compose up -d db)
// Skip in CI without DB by checking DATABASE_URL
const describeWithDb = process.env.DATABASE_URL || process.env.CI ? describe : describe.skip;

describeWithDb('agents API', () => {
  beforeEach(async () => {
    // Clean tables before each test
    await db.delete(schema.tags);
    await db.delete(schema.agentVersions);
    await db.delete(schema.agents);
  });

  afterAll(async () => {
    await db.delete(schema.tags);
    await db.delete(schema.agentVersions);
    await db.delete(schema.agents);
  });

  const validAgent = {
    version: '1.0.0',
    definition: {
      name: 'test-agent',
      description: 'A test agent',
      model: 'claude-sonnet-4-20250514',
      instructions: 'You are helpful.',
    },
    readme: 'Test agent readme',
    tags: ['test', 'demo'],
  };

  describe('PUT /v1/agents/:scope/:name', () => {
    it('creates a new agent and returns 201', async () => {
      const res = await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validAgent),
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.name).toBe('test-agent');
      expect(body.scope).toBe('@acme');
      expect(body.version).toBe('1.0.0');
    });

    it('adds a new version to an existing agent and returns 200', async () => {
      // First push
      await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validAgent),
      });

      // Second push with new version
      const res = await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validAgent, version: '1.1.0' }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.version).toBe('1.1.0');
    });

    it('rejects invalid agent definition with 400', async () => {
      const res = await app.request('/v1/agents/@acme/bad-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '1.0.0',
          definition: { name: 'bad-agent' }, // missing required fields
        }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects duplicate version with 409', async () => {
      await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validAgent),
      });

      const res = await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validAgent), // same version
      });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /v1/agents/:scope/:name', () => {
    it('returns latest version of an agent', async () => {
      await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validAgent),
      });

      const res = await app.request('/v1/agents/@acme/test-agent');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.definition.name).toBe('test-agent');
      expect(body.version).toBe('1.0.0');
    });

    it('returns specific version when queried', async () => {
      await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validAgent),
      });
      await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validAgent, version: '2.0.0' }),
      });

      const res = await app.request('/v1/agents/@acme/test-agent?version=1.0.0');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.version).toBe('1.0.0');
    });

    it('returns 404 for unknown agent', async () => {
      const res = await app.request('/v1/agents/@acme/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/agents/:scope/:name/versions', () => {
    it('lists all versions', async () => {
      await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validAgent),
      });
      await app.request('/v1/agents/@acme/test-agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validAgent, version: '2.0.0' }),
      });

      const res = await app.request('/v1/agents/@acme/test-agent/versions');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.versions).toHaveLength(2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run packages/registry/src/__tests__/agents.test.ts`
Expected: FAIL — routes don't exist yet

**Step 3: Implement the agents route**

```typescript
// packages/registry/src/routes/agents.ts
import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { validate } from '@automagent/schema';
import { db, schema } from '../db/index.js';

const { agents, agentVersions, tags } = schema;

export const agentsRouter = new Hono();

// PUT /v1/agents/:scope/:name — push a new version
agentsRouter.put('/:scope/:name', async (c) => {
  const scope = c.req.param('scope');
  const name = c.req.param('name');

  const body = await c.req.json<{
    version: string;
    definition: Record<string, unknown>;
    readme?: string;
    tags?: string[];
  }>();

  // Validate the agent definition
  const result = validate(body.definition);
  if (!result.valid) {
    return c.json({ error: 'Invalid agent definition', details: result.errors }, 400);
  }

  // Check if agent exists
  const existing = await db.query.agents.findFirst({
    where: and(eq(agents.scope, scope), eq(agents.name, name)),
  });

  if (existing) {
    // Check for duplicate version
    const existingVersion = await db.query.agentVersions.findFirst({
      where: and(eq(agentVersions.agentId, existing.id), eq(agentVersions.version, body.version)),
    });
    if (existingVersion) {
      return c.json({ error: `Version ${body.version} already exists` }, 409);
    }

    // Add new version
    await db.insert(agentVersions).values({
      agentId: existing.id,
      version: body.version,
      definition: body.definition,
      readme: body.readme ?? null,
    });

    // Update latest version
    await db.update(agents)
      .set({ latestVersion: body.version, updatedAt: new Date() })
      .where(eq(agents.id, existing.id));

    // Sync tags
    if (body.tags) {
      await db.delete(tags).where(eq(tags.agentId, existing.id));
      if (body.tags.length > 0) {
        await db.insert(tags).values(
          body.tags.map((tag) => ({ agentId: existing.id, tag })),
        );
      }
    }

    return c.json({ name, scope, version: body.version }, 200);
  }

  // Create new agent
  const [newAgent] = await db.insert(agents).values({
    name,
    scope,
    description: String(body.definition.description ?? ''),
    latestVersion: body.version,
  }).returning();

  await db.insert(agentVersions).values({
    agentId: newAgent.id,
    version: body.version,
    definition: body.definition,
    readme: body.readme ?? null,
  });

  if (body.tags && body.tags.length > 0) {
    await db.insert(tags).values(
      body.tags.map((tag) => ({ agentId: newAgent.id, tag })),
    );
  }

  return c.json({ name, scope, version: body.version }, 201);
});

// GET /v1/agents/:scope/:name — pull (latest or specific version)
agentsRouter.get('/:scope/:name', async (c) => {
  const scope = c.req.param('scope');
  const name = c.req.param('name');
  const versionQuery = c.req.query('version');

  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.scope, scope), eq(agents.name, name)),
  });

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  let version;
  if (versionQuery) {
    version = await db.query.agentVersions.findFirst({
      where: and(eq(agentVersions.agentId, agent.id), eq(agentVersions.version, versionQuery)),
    });
  } else {
    version = await db.query.agentVersions.findFirst({
      where: eq(agentVersions.agentId, agent.id),
      orderBy: [desc(agentVersions.createdAt)],
    });
  }

  if (!version) {
    return c.json({ error: 'Version not found' }, 404);
  }

  return c.json({
    name: agent.name,
    scope: agent.scope,
    version: version.version,
    definition: version.definition,
    readme: version.readme,
    createdAt: version.createdAt,
  });
});

// GET /v1/agents/:scope/:name/versions — list all versions
agentsRouter.get('/:scope/:name/versions', async (c) => {
  const scope = c.req.param('scope');
  const name = c.req.param('name');

  const agent = await db.query.agents.findFirst({
    where: and(eq(agents.scope, scope), eq(agents.name, name)),
  });

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const versions = await db.query.agentVersions.findMany({
    where: eq(agentVersions.agentId, agent.id),
    orderBy: [desc(agentVersions.createdAt)],
  });

  return c.json({
    name: agent.name,
    scope: agent.scope,
    versions: versions.map((v) => ({
      version: v.version,
      createdAt: v.createdAt,
    })),
  });
});
```

**Step 4: Update app.ts to mount the routes**

```typescript
// packages/registry/src/app.ts
import { Hono } from 'hono';
import { agentsRouter } from './routes/agents.js';

export const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/v1/agents', agentsRouter);
```

**Step 5: Run tests**

Run: `docker compose up -d db` (if not already running)
Run: `DATABASE_URL=postgres://automagent:automagent@localhost:5432/automagent npx vitest run packages/registry/src/__tests__/agents.test.ts`
Expected: All tests pass

**Step 6: Commit**

```bash
git add packages/registry/src/routes/ packages/registry/src/app.ts packages/registry/src/__tests__/agents.test.ts
git commit -m "feat(registry): implement push, pull, and version list API routes"
```

---

### Task 11: List + Search Routes

**Files:**
- Create: `packages/registry/src/routes/search.ts`
- Modify: `packages/registry/src/app.ts`
- Create: `packages/registry/src/__tests__/search.test.ts`

**Step 1: Write the failing test**

```typescript
// packages/registry/src/__tests__/search.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { app } from '../app.js';
import { db, schema } from '../db/index.js';

const describeWithDb = process.env.DATABASE_URL || process.env.CI ? describe : describe.skip;

describeWithDb('search API', () => {
  beforeEach(async () => {
    await db.delete(schema.tags);
    await db.delete(schema.agentVersions);
    await db.delete(schema.agents);

    // Seed two agents
    await app.request('/v1/agents/@acme/data-analyst', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '1.0.0',
        definition: { name: 'data-analyst', description: 'Analyzes data sets', model: 'gpt-4' },
        tags: ['analytics', 'data'],
      }),
    });
    await app.request('/v1/agents/@acme/code-reviewer', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: '1.0.0',
        definition: { name: 'code-reviewer', description: 'Reviews pull requests', model: 'claude-sonnet-4-20250514' },
        tags: ['code', 'review'],
      }),
    });
  });

  afterAll(async () => {
    await db.delete(schema.tags);
    await db.delete(schema.agentVersions);
    await db.delete(schema.agents);
  });

  describe('GET /v1/agents', () => {
    it('lists all agents', async () => {
      const res = await app.request('/v1/agents');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(2);
    });

    it('supports pagination', async () => {
      const res = await app.request('/v1/agents?limit=1&offset=0');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(1);
      expect(body.total).toBe(2);
    });
  });

  describe('GET /v1/search', () => {
    it('finds agents by name substring', async () => {
      const res = await app.request('/v1/search?q=data');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0].name).toBe('data-analyst');
    });

    it('finds agents by description', async () => {
      const res = await app.request('/v1/search?q=pull+requests');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0].name).toBe('code-reviewer');
    });

    it('finds agents by tag', async () => {
      const res = await app.request('/v1/search?tags=analytics');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(1);
    });

    it('returns empty array for no matches', async () => {
      const res = await app.request('/v1/search?q=nonexistent');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `DATABASE_URL=postgres://automagent:automagent@localhost:5432/automagent npx vitest run packages/registry/src/__tests__/search.test.ts`
Expected: FAIL

**Step 3: Implement search route**

```typescript
// packages/registry/src/routes/search.ts
import { Hono } from 'hono';
import { eq, or, ilike, inArray, desc, count, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const { agents, tags } = schema;

export const searchRouter = new Hono();

// GET /v1/agents — list all (paginated)
searchRouter.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  const offset = Number(c.req.query('offset') ?? 0);

  const [items, totalResult] = await Promise.all([
    db.query.agents.findMany({
      limit,
      offset,
      orderBy: [desc(agents.updatedAt)],
    }),
    db.select({ count: count() }).from(agents),
  ]);

  return c.json({
    agents: items.map((a) => ({
      name: a.name,
      scope: a.scope,
      description: a.description,
      latestVersion: a.latestVersion,
      updatedAt: a.updatedAt,
    })),
    total: totalResult[0].count,
    limit,
    offset,
  });
});

// GET /v1/search — search by query and/or tags
searchRouter.get('/', async (c) => {
  const q = c.req.query('q');
  const tagFilter = c.req.query('tags');
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  const offset = Number(c.req.query('offset') ?? 0);

  let agentIds: string[] | null = null;

  // Filter by tags first if specified
  if (tagFilter) {
    const tagList = tagFilter.split(',').map((t) => t.trim());
    const tagRows = await db.query.tags.findMany({
      where: inArray(tags.tag, tagList),
    });
    agentIds = [...new Set(tagRows.map((t) => t.agentId))];
    if (agentIds.length === 0) {
      return c.json({ agents: [], total: 0, limit, offset });
    }
  }

  // Build text search conditions
  const conditions = [];
  if (q) {
    conditions.push(or(
      ilike(agents.name, `%${q}%`),
      ilike(agents.description, `%${q}%`),
    ));
  }
  if (agentIds) {
    conditions.push(inArray(agents.id, agentIds));
  }

  const where = conditions.length > 0
    ? conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`
    : undefined;

  const [items, totalResult] = await Promise.all([
    db.select().from(agents).where(where).limit(limit).offset(offset).orderBy(desc(agents.updatedAt)),
    db.select({ count: count() }).from(agents).where(where),
  ]);

  return c.json({
    agents: items.map((a) => ({
      name: a.name,
      scope: a.scope,
      description: a.description,
      latestVersion: a.latestVersion,
      updatedAt: a.updatedAt,
    })),
    total: totalResult[0].count,
    limit,
    offset,
  });
});
```

**Step 4: Update app.ts**

```typescript
// packages/registry/src/app.ts
import { Hono } from 'hono';
import { agentsRouter } from './routes/agents.js';
import { searchRouter } from './routes/search.js';

export const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/v1/agents', agentsRouter);
app.route('/v1/search', searchRouter);
```

Note: The list endpoint (`GET /v1/agents`) needs to be mounted on the agentsRouter before the `:scope/:name` param routes, or as a separate handler. You may need to adjust route ordering — put the list handler on agentsRouter directly as a `get('/')` before the parameterized routes.

**Step 5: Run tests**

Run: `DATABASE_URL=postgres://automagent:automagent@localhost:5432/automagent npx vitest run packages/registry/src/__tests__/search.test.ts`
Expected: All tests pass

**Step 6: Commit**

```bash
git add packages/registry/src/routes/search.ts packages/registry/src/app.ts packages/registry/src/__tests__/search.test.ts
git commit -m "feat(registry): implement agent listing and search API"
```

---

## Phase D: CLI Integration

### Task 12: Wire Push Command

**Files:**
- Create: `packages/cli/src/commands/push.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/commands/stubs.ts` (remove push stub)

**Step 1: Write the failing test**

Add to `packages/cli/src/commands/__tests__/commands.test.ts`:

```typescript
describe('push command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'push-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 1 when agent.yaml does not exist', () => {
    const { exitCode, stdout } = runCli('push --registry http://localhost:3000', tmpDir);
    expect(exitCode).toBe(1);
  });

  it('exits 1 when agent.yaml is invalid', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'bad: content\n');
    const { exitCode } = runCli('push --registry http://localhost:3000', tmpDir);
    expect(exitCode).toBe(1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run build --workspace=packages/cli && npx vitest run packages/cli/src/commands/__tests__/commands.test.ts -t "push command"`
Expected: FAIL — push is a stub, doesn't accept `--registry`

**Step 3: Implement push command**

```typescript
// packages/cli/src/commands/push.ts
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { validate } from '@automagent/schema';
import { parseYamlFile } from '../utils/yaml.js';
import { success, error, info, heading } from '../utils/output.js';

const DEFAULT_REGISTRY = 'http://localhost:3000';

export function pushCommand(program: Command): void {
  program
    .command('push')
    .description('Push agent definition to the registry')
    .argument('[path]', 'Path to agent.yaml', './agent.yaml')
    .option('--registry <url>', 'Registry URL', DEFAULT_REGISTRY)
    .option('--scope <scope>', 'Agent scope (e.g. @acme)')
    .action(async (path: string, opts: { registry: string; scope?: string }) => {
      const filePath = resolve(path);

      heading('Pushing to registry');

      // Parse YAML
      const { data, error: parseError } = parseYamlFile(filePath);
      if (parseError) {
        error(parseError);
        process.exitCode = 1;
        return;
      }

      // Validate
      const result = validate(data);
      if (!result.valid) {
        error('Invalid agent definition:');
        for (const e of result.errors) {
          error(`  ${e.instancePath || '/'}: ${e.message ?? 'validation error'}`);
        }
        process.exitCode = 1;
        return;
      }

      const def = data as Record<string, unknown>;
      const name = String(def.name);
      const version = String(def.version ?? '0.1.0');
      const scope = opts.scope ?? '@local';
      const tags = (def.metadata as Record<string, unknown> | undefined)?.tags as string[] | undefined;

      const url = `${opts.registry}/v1/agents/${encodeURIComponent(scope)}/${encodeURIComponent(name)}`;

      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version, definition: def, tags }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          error(`Registry returned ${res.status}: ${(body as Record<string, string>).error ?? res.statusText}`);
          process.exitCode = 1;
          return;
        }

        success(`Pushed ${scope}/${name}@${version} to ${opts.registry}`);
      } catch (err) {
        error(`Failed to connect to registry at ${opts.registry}`);
        info('Is the registry running? Start it with: docker compose up');
        process.exitCode = 1;
      }
    });
}
```

**Step 4: Update stubs.ts — remove push from stubs**

Remove the `push` command registration from `packages/cli/src/commands/stubs.ts`.

**Step 5: Update index.ts — register push command**

Add to `packages/cli/src/index.ts`:
```typescript
import { pushCommand } from './commands/push.js';
// ... after other command registrations:
pushCommand(program);
```

**Step 6: Run tests**

Run: `npm run build --workspace=packages/cli && npx vitest run packages/cli/src/commands/__tests__/commands.test.ts -t "push command"`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/cli/src/commands/push.ts packages/cli/src/commands/stubs.ts packages/cli/src/index.ts
git commit -m "feat(cli): implement push command with registry integration"
```

---

### Task 13: Wire Pull Command

**Files:**
- Create: `packages/cli/src/commands/pull.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/commands/stubs.ts` (remove pull stub)

**Step 1: Write the failing test**

Add to `packages/cli/src/commands/__tests__/commands.test.ts`:

```typescript
describe('pull command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pull-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 1 when registry is unreachable', () => {
    const { exitCode } = runCli('pull @acme/test-agent --registry http://localhost:9999', tmpDir);
    expect(exitCode).toBe(1);
  });

  it('refuses to overwrite without --force', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'existing');
    const { exitCode, stdout } = runCli('pull @acme/test-agent --registry http://localhost:9999', tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/already exists/i);
  });
});
```

**Step 2: Implement pull command**

```typescript
// packages/cli/src/commands/pull.ts
import { resolve } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { stringify } from 'yaml';
import { success, error, info, heading } from '../utils/output.js';
import { SCHEMA_HEADER } from '../utils/constants.js';

const DEFAULT_REGISTRY = 'http://localhost:3000';

function parseAgentRef(ref: string): { scope: string; name: string; version?: string } {
  // Format: @scope/name:version or @scope/name
  const versionSplit = ref.split(':');
  const refPart = versionSplit[0];
  const version = versionSplit[1];

  const match = refPart.match(/^(@[^/]+)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid agent reference: "${ref}". Expected format: @scope/name or @scope/name:version`);
  }

  return { scope: match[1], name: match[2], version };
}

export function pullCommand(program: Command): void {
  program
    .command('pull')
    .description('Pull agent definition from the registry')
    .argument('<ref>', 'Agent reference (e.g. @acme/my-agent or @acme/my-agent:1.0.0)')
    .option('-o, --output <path>', 'Output file path', './agent.yaml')
    .option('--registry <url>', 'Registry URL', DEFAULT_REGISTRY)
    .option('--force', 'Overwrite existing file')
    .action(async (ref: string, opts: { output: string; registry: string; force?: boolean }) => {
      const outputPath = resolve(opts.output);

      heading('Pulling from registry');

      if (existsSync(outputPath) && !opts.force) {
        error(`${opts.output} already exists. Use --force to overwrite.`);
        process.exitCode = 1;
        return;
      }

      let parsed;
      try {
        parsed = parseAgentRef(ref);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
      }

      const url = `${opts.registry}/v1/agents/${encodeURIComponent(parsed.scope)}/${encodeURIComponent(parsed.name)}${parsed.version ? `?version=${parsed.version}` : ''}`;

      try {
        const res = await fetch(url);

        if (res.status === 404) {
          error(`Agent not found: ${ref}`);
          process.exitCode = 1;
          return;
        }

        if (!res.ok) {
          error(`Registry returned ${res.status}: ${res.statusText}`);
          process.exitCode = 1;
          return;
        }

        const body = await res.json() as { definition: Record<string, unknown>; version: string };
        const yamlContent = `${SCHEMA_HEADER}\n${stringify(body.definition, { lineWidth: 120 })}`;

        writeFileSync(outputPath, yamlContent, 'utf-8');
        success(`Pulled ${ref}@${body.version} to ${opts.output}`);
      } catch (err) {
        error(`Failed to connect to registry at ${opts.registry}`);
        info('Is the registry running? Start it with: docker compose up');
        process.exitCode = 1;
      }
    });
}
```

**Step 3: Update stubs.ts — remove pull from stubs**

Remove the `pull` command from `packages/cli/src/commands/stubs.ts`.

**Step 4: Update index.ts**

```typescript
import { pullCommand } from './commands/pull.js';
// ...
pullCommand(program);
```

**Step 5: Build and run tests**

Run: `npm run build --workspace=packages/cli && npx vitest run packages/cli/src/commands/__tests__/commands.test.ts -t "pull command"`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/cli/src/commands/pull.ts packages/cli/src/commands/stubs.ts packages/cli/src/index.ts
git commit -m "feat(cli): implement pull command with registry integration"
```

---

### Task 14: Wire Search Command

**Files:**
- Create: `packages/cli/src/commands/search.ts`
- Modify: `packages/cli/src/index.ts`

**Step 1: Write the failing test**

Add to `packages/cli/src/commands/__tests__/commands.test.ts`:

```typescript
describe('search command', () => {
  it('exits 1 when registry is unreachable', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'search-test-'));
    try {
      const { exitCode } = runCli('search test-query --registry http://localhost:9999', tmpDir);
      expect(exitCode).toBe(1);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
```

**Step 2: Implement search command**

```typescript
// packages/cli/src/commands/search.ts
import type { Command } from 'commander';
import chalk from 'chalk';
import { error, info, heading } from '../utils/output.js';

const DEFAULT_REGISTRY = 'http://localhost:3000';

interface SearchResult {
  agents: Array<{
    name: string;
    scope: string;
    description: string;
    latestVersion: string;
    updatedAt: string;
  }>;
  total: number;
}

export function searchCommand(program: Command): void {
  program
    .command('search')
    .description('Search the registry for agents')
    .argument('[query]', 'Search query')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('--registry <url>', 'Registry URL', DEFAULT_REGISTRY)
    .action(async (query: string | undefined, opts: { tags?: string; registry: string }) => {
      heading('Searching registry');

      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (opts.tags) params.set('tags', opts.tags);

      const url = `${opts.registry}/v1/search?${params}`;

      try {
        const res = await fetch(url);

        if (!res.ok) {
          error(`Registry returned ${res.status}: ${res.statusText}`);
          process.exitCode = 1;
          return;
        }

        const body = (await res.json()) as SearchResult;

        if (body.agents.length === 0) {
          info('No agents found.');
          return;
        }

        console.log(chalk.dim(`Found ${body.total} agent(s):\n`));

        for (const agent of body.agents) {
          console.log(
            chalk.bold(`${agent.scope}/${agent.name}`) +
              chalk.dim(`@${agent.latestVersion}`),
          );
          console.log(`  ${agent.description}`);
          console.log();
        }
      } catch (err) {
        error(`Failed to connect to registry at ${opts.registry}`);
        info('Is the registry running? Start it with: docker compose up');
        process.exitCode = 1;
      }
    });
}
```

**Step 3: Update index.ts**

```typescript
import { searchCommand } from './commands/search.js';
// ...
searchCommand(program);
```

**Step 4: Build and run tests**

Run: `npm run build --workspace=packages/cli && npx vitest run packages/cli/src/commands/__tests__/commands.test.ts -t "search command"`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/cli/src/commands/search.ts packages/cli/src/index.ts
git commit -m "feat(cli): implement search command with registry integration"
```

---

## Phase E: Integration Testing

### Task 15: Full E2E Test (CLI + Registry)

**Files:**
- Create: `scripts/e2e-test.sh`

**Step 1: Write the end-to-end test script**

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Automagent E2E Test (CLI + Registry) ==="
echo "Requires: docker compose up -d (Postgres + registry)"
echo ""

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

CLI="node $(pwd)/packages/cli/dist/index.js"
REGISTRY="http://localhost:3000"

echo "1. Health check..."
curl -sf "$REGISTRY/health" > /dev/null
echo "   PASS"

echo "2. Init agent..."
(cd "$TMPDIR" && $CLI init --quick --name e2e-test-agent)
echo "   PASS"

echo "3. Validate agent..."
(cd "$TMPDIR" && $CLI validate)
echo "   PASS"

echo "4. Push agent..."
(cd "$TMPDIR" && $CLI push --registry "$REGISTRY" --scope @test)
echo "   PASS"

echo "5. Pull agent to new file..."
(cd "$TMPDIR" && $CLI pull @test/e2e-test-agent -o pulled.yaml --registry "$REGISTRY")
test -f "$TMPDIR/pulled.yaml"
echo "   PASS"

echo "6. Validate pulled agent..."
(cd "$TMPDIR" && $CLI validate pulled.yaml)
echo "   PASS"

echo "7. Search for agent..."
SEARCH_OUTPUT=$($CLI search e2e-test --registry "$REGISTRY" 2>&1)
echo "$SEARCH_OUTPUT" | grep -q "e2e-test-agent"
echo "   PASS"

echo ""
echo "=== All E2E tests passed ==="
```

**Step 2: Make executable**

Run: `chmod +x scripts/e2e-test.sh`

**Step 3: Run it (requires docker compose up)**

Run: `docker compose up -d && sleep 3 && npm run build && bash scripts/e2e-test.sh`
Expected: All 7 steps pass

**Step 4: Commit**

```bash
git add scripts/e2e-test.sh
git commit -m "test: add full E2E test for CLI-to-registry flow"
```

---

## Phase F: Documentation + Final Polish

### Task 16: Update README with Registry Docs

**Files:**
- Modify: `README.md`

**Step 1: Read current README, then update with registry section**

Add after the Quick Start section:

```markdown
## Local Registry

Run the registry locally with Docker:

\`\`\`bash
docker compose up -d
\`\`\`

Push and pull agents:

\`\`\`bash
automagent init --quick --name my-agent
automagent push --scope @myteam
automagent pull @myteam/my-agent
automagent search "my query"
\`\`\`
```

Update the Packages table to include registry.

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add registry quick start and CLI commands to README"
```

---

### Task 17: Registry CLAUDE.md

**Files:**
- Create: `packages/registry/CLAUDE.md`

**Step 1: Write the file**

```markdown
# CLAUDE.md

## What This Is

`@automagent/registry` — local API server for storing and discovering automagent agent definitions.

## Commands

\`\`\`bash
npm run build          # Build with tsup
npm run dev            # Watch mode with tsx
npm run start          # Run production build
npm run test           # Run vitest
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run migrations against DATABASE_URL
\`\`\`

## Architecture

Hono API server with Drizzle ORM + PostgreSQL. Validates definitions using `@automagent/schema` on push.

### Routes
- `PUT /v1/agents/:scope/:name` — push agent version
- `GET /v1/agents/:scope/:name` — pull latest (or `?version=x.y.z`)
- `GET /v1/agents/:scope/:name/versions` — list versions
- `GET /v1/agents` — list all agents (paginated)
- `GET /v1/search?q=&tags=` — search agents
- `GET /health` — health check

### Database
Tables: `agents`, `agent_versions`, `tags`. Schema defined in `src/db/schema.ts`.

## Running Locally

\`\`\`bash
docker compose up -d db            # Start Postgres
npm run db:migrate                  # Run migrations
npm run dev                         # Start server on :3000
\`\`\`
```

**Step 2: Commit**

```bash
git add packages/registry/CLAUDE.md
git commit -m "docs: add CLAUDE.md for registry package"
```

---

## Summary

| Phase | Tasks | Purpose |
|-------|-------|---------|
| A | 1-4 | Phase 1 polish: templates, contributing guide, metadata, smoke test |
| B | 5-8 | Registry scaffold: package, Drizzle schema, Docker, migrations |
| C | 9-11 | Registry API: health, push/pull, list/search |
| D | 12-14 | CLI integration: push, pull, search commands |
| E | 15 | Full E2E testing |
| F | 16-17 | Documentation updates |

**Total: 17 tasks across 6 phases.**

Dependencies:
- Phase B depends on Phase A only for the workspace config change (Task 5)
- Phase C depends on Phase B (needs DB schema)
- Phase D depends on Phase C (needs API routes)
- Phase E depends on Phases C + D (needs both running)
- Phase F can start after Phase D

Parallelizable:
- Tasks 1-4 (Phase A) are all independent
- Tasks 5-7 can partially overlap (package, schema, Docker)
- Tasks 12-14 (CLI commands) are independent of each other once Phase C is done
- Task 16 and 17 are independent
