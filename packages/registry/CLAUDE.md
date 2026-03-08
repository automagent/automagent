# CLAUDE.md

## What This Is

`@automagent/registry` — local API server for storing and discovering automagent agent definitions.

## Commands

```bash
npm run build          # Build with tsup
npm run dev            # Watch mode with tsx
npm run start          # Run production build
npm run test           # Run vitest (needs DATABASE_URL)
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run migrations against DATABASE_URL
```

Run tests with database:
```bash
DATABASE_URL=postgres://automagent:automagent@localhost:5434/automagent npm run test
```

## Architecture

Hono API server with Drizzle ORM + PostgreSQL. Validates agent definitions server-side using `@automagent/schema` on push.

### Routes
- `PUT /v1/agents/:scope/:name` — push agent version
- `GET /v1/agents/:scope/:name` — pull latest (or `?version=x.y.z`)
- `GET /v1/agents/:scope/:name/versions` — list versions
- `GET /v1/agents` — list all agents (paginated)
- `GET /v1/search?q=&tags=` — search agents
- `GET /health` — health check

### Database
Tables: `agents`, `agent_versions`, `tags`. Schema in `src/db/schema.ts`. Drizzle ORM with postgres.js driver.

### Key Files
- `src/app.ts` — Hono app with route mounting
- `src/index.ts` — Server entry point (uses @hono/node-server)
- `src/routes/agents.ts` — Push, pull, list, versions routes
- `src/routes/search.ts` — Search route
- `src/db/schema.ts` — Drizzle table definitions
- `src/db/index.ts` — DB connection
- `src/db/migrate.ts` — Migration runner

## Running Locally

```bash
docker compose up -d db            # Start Postgres on port 5434
npm run db:migrate                  # Run migrations
npm run dev                         # Start server on :3000
```

## Testing

Integration tests hit real Postgres. Requires `docker compose up -d db` first:
```bash
DATABASE_URL=postgres://automagent:automagent@localhost:5434/automagent npx vitest run packages/registry/
```
