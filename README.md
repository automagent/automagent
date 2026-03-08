# Automagent

[![npm version](https://img.shields.io/npm/v/@automagent/cli)](https://www.npmjs.com/package/@automagent/cli)
[![npm version](https://img.shields.io/npm/v/@automagent/schema)](https://www.npmjs.com/package/@automagent/schema)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

An open standard for defining AI agents via `agent.yaml` — YAML for humans, JSON Schema for machines.

## Packages

| Package | Description |
|---------|-------------|
| [`@automagent/schema`](packages/schema/) | JSON Schema, TypeScript types, and validator |
| [`@automagent/cli`](packages/cli/) | CLI toolkit: init, validate, run, import, push, pull, search |

## Quick Start

```bash
npm install -g @automagent/cli
automagent init
automagent validate
```

## Registry

Push, pull, and search agents using the hosted registry:

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
