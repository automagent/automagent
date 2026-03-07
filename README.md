# Automagent

An open standard for defining AI agents via `agent.yaml` — YAML for humans, JSON Schema for machines.

## Packages

| Package | Description |
|---------|-------------|
| [`@automagent/schema`](packages/schema/) | JSON Schema, TypeScript types, and validator |
| [`@automagent/cli`](packages/cli/) | CLI toolkit: init, validate, run, import |

## Quick Start

```bash
npm install -g @automagent/cli
automagent init
automagent validate
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
