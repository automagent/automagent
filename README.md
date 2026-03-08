# Automagent

An open standard for defining AI agents via `agent.yaml` — YAML for humans, JSON Schema for machines.

## Packages

| Package | Description |
|---------|-------------|
| [`@automagent/schema`](packages/schema/) | JSON Schema, TypeScript types, and validator |
| [`@automagent/cli`](packages/cli/) | CLI toolkit: init, validate, run, import, push, pull, search |
| [`@automagent/registry`](packages/registry/) | Local registry API server (Hono + Postgres) |

## Quick Start

```bash
npm install -g @automagent/cli
automagent init
automagent validate
```

## Local Registry

Run the agent registry locally with Docker:

```bash
docker compose up -d db          # Start Postgres
npm run db:migrate -w packages/registry  # Run migrations
npm run dev -w packages/registry # Start registry on :3000
```

Push, pull, and search agents:

```bash
automagent init --quick --name my-agent
automagent push --scope @myteam
automagent pull @myteam/my-agent
automagent search "my query"
automagent search --tags analytics,data
```

## Development

```bash
npm install           # Install all workspace dependencies
npm run build         # Build all packages (schema first, then cli)
npm run test          # Run all tests
npm run lint          # Type-check all packages
```

Build or test a single package:

```bash
npm run test --workspace=packages/schema
npm run test --workspace=packages/cli
```

## Documentation

- [Specification](docs/spec.md)
- [Schema Design Decisions](docs/decisions/schema-design.md)
- [Examples](docs/examples/)

## License

Apache-2.0
