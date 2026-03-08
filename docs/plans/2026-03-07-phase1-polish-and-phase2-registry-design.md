# Design: Phase 1 Polish + Phase 2 Registry Prototype

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Complete Phase 1 publishing prep; build local registry prototype with push/pull/search

---

## 1. Phase 1 Polish

Finish packaging and documentation to make the existing CLI publish-ready. No code changes to schema or CLI logic.

### Deliverables

| Deliverable | Detail |
|-------------|--------|
| Root README | CLI usage docs, quickstart, badge placeholders |
| GitHub issue templates | Bug report, feature request, agent schema feedback |
| Contributing guide | CONTRIBUTING.md with dev setup, PR process |
| Package audit | Verify `package.json` metadata (repository, homepage, keywords) for both packages |
| npm publish dry-run | `npm pack` both packages, verify contents |
| End-to-end smoke test | Script: `init --quick` then `validate` then confirms exit 0 |

---

## 2. Phase 2 Registry Prototype

### 2.1 New Package: `packages/registry`

A Hono API server with Drizzle ORM + Postgres. Third workspace package in the monorepo.

**Tech stack:**
- Runtime: Node.js + TypeScript
- Framework: Hono
- ORM: Drizzle
- Database: PostgreSQL 16 (Docker)
- Shared dependency: `@automagent/schema` (validation + types)

### 2.2 Data Model

```
agents
  id              uuid, pk
  name            text, unique within scope
  scope           text, nullable (e.g. "@acme")
  description     text
  latest_version  text, semver
  created_at      timestamp
  updated_at      timestamp

agent_versions
  id              uuid, pk
  agent_id        fk -> agents
  version         text, semver
  definition      jsonb (full agent.yaml as JSON)
  readme          text, nullable
  created_at      timestamp
  unique(agent_id, version)

tags
  id              uuid, pk
  agent_id        fk -> agents
  tag             text
  unique(agent_id, tag)
```

### 2.3 API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `PUT` | `/v1/agents/:scope/:name` | Push (upsert agent + new version) |
| `GET` | `/v1/agents/:scope/:name` | Pull (latest or `?version=x.y.z`) |
| `GET` | `/v1/agents/:scope/:name/versions` | List all versions |
| `GET` | `/v1/search?q=&tags=` | Search by name/description/tags |
| `GET` | `/v1/agents` | List/browse all agents (paginated) |
| `GET` | `/health` | Health check |

### 2.4 Push Flow

1. CLI reads local `agent.yaml`, validates via schema
2. `PUT` to registry with agent definition + version
3. Server validates again server-side (reuses `@automagent/schema`)
4. Upserts agent record, creates version row, updates tags
5. Returns confirmation with registry URL

### 2.5 Pull Flow

1. CLI calls `GET` with agent ref (e.g. `@acme/my-agent:^1.0.0`)
2. Server resolves semver range to best match
3. Returns YAML definition
4. CLI writes to local `agent.yaml`

### 2.6 Search

- Full-text search on `name` and `description` via Postgres `tsvector`
- Tag filtering via join on `tags` table
- Paginated results (default 20 per page)
- Sort by relevance, recency, or name

### 2.7 Infrastructure (Docker Compose)

```yaml
services:
  registry:
    build: ./packages/registry
    ports: ["3000:3000"]
    depends_on: [db]
    environment:
      DATABASE_URL: postgres://automagent:automagent@db:5432/automagent
  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_USER: automagent
      POSTGRES_PASSWORD: automagent
      POSTGRES_DB: automagent
volumes:
  pgdata:
```

### 2.8 CLI Changes

- Wire stub commands (`push`, `pull`) to call registry API
- Add `search` command
- New `--registry` flag on push/pull/search (defaults to `http://localhost:3000`)
- Agent ref parsing: `@scope/name:version` format

---

## 3. Team Assignments

| Role | Workstream |
|------|-----------|
| Product Manager | Phase 1 polish: README, contributing guide, issue templates, launch checklist |
| Software Architect | Registry API scaffold: Hono server, routes, middleware, Docker setup |
| DBA | Data model: Drizzle schema, migrations, seed data |
| QA Analyst | Test strategy: API integration tests, CLI-to-registry e2e tests, smoke test |
| Documentation Writer | API docs, registry usage guide, updated CLI help text |
| Team Manager | Coordinate dependencies, review PRs, maintain task board |

---

## 4. Package Structure

```
automagent/
  packages/
    schema/          # existing - types, JSON Schema, Ajv validator
    cli/             # existing - init, validate, run, import + push/pull/search
    registry/        # NEW
      src/
        index.ts           # Hono app entry
        routes/
          agents.ts        # CRUD + push/pull
          search.ts        # Search endpoint
          health.ts        # Health check
        db/
          schema.ts        # Drizzle table definitions
          migrate.ts       # Migration runner
          migrations/      # SQL migration files
        middleware/
          validate.ts      # Request validation
      Dockerfile
      package.json         # @automagent/registry
      tsconfig.json
      tsup.config.ts
      drizzle.config.ts
  docker-compose.yml       # Root-level compose file
```

---

## 5. Out of Scope

- Authentication / login (Phase 2 full)
- `diff` command (needs auth context)
- Web UI
- Rate limiting
- File/blob storage (definitions stored as JSONB)
- CI/CD publishing
