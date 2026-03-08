# @automagent/registry

Local API server for storing and discovering [Automagent](https://github.com/automagent/automagent) agent definitions. Built with Hono, Drizzle ORM, and PostgreSQL.

## Quick Start

```bash
docker compose up -d db                        # Start Postgres
npm run db:migrate -w packages/registry        # Run migrations
npm run dev -w packages/registry               # Start server on :3000
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/v1/agents/:scope/:name` | Push an agent version |
| `GET` | `/v1/agents/:scope/:name` | Pull latest (or `?version=x.y.z`) |
| `GET` | `/v1/agents/:scope/:name/versions` | List versions |
| `GET` | `/v1/agents` | List all agents (paginated) |
| `GET` | `/v1/search?q=&tags=` | Search agents |
| `GET` | `/health` | Health check |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://automagent:automagent@localhost:5434/automagent` | PostgreSQL connection string |
| `PORT` | `3000` | Server port |

## Development

```bash
npm run build          # Build with tsup
npm run dev            # Watch mode with tsx
npm run test           # Run tests (requires DATABASE_URL)
npm run db:generate    # Generate Drizzle migrations
npm run db:migrate     # Run migrations
```

## License

Apache-2.0
