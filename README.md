  <p align="center">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://automagent.dev/logo/lockup-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://automagent.dev/logo/lockup-light.svg">
      <img alt="automagent" src="https://automagent.dev/logo/lockup-dark.svg" width="280">
    </picture>
  </p>

<p align="center">
  <a href="https://www.npmjs.com/package/automagent"><img src="https://img.shields.io/npm/v/automagent" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@automagent/schema"><img src="https://img.shields.io/npm/v/@automagent/schema" alt="npm version"></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache-2.0"></a>
</p>

**An open standard for defining AI agents via `agent.yaml` — YAML for humans, JSON Schema for machines.**

Define an agent in 3 lines. Scale to enterprise governance without changing the format.

## What is `agent.yaml`?

```yaml
name: my-agent
description: Answers questions about our codebase
model: claude-sonnet
```

That's a complete agent definition. Three required fields — name, description, model — and you're running.

As your needs grow, the same file scales with you:

<details>
<summary><strong>Add tools, MCP servers, and context</strong></summary>

```yaml
name: research-assistant
description: Searches the web and summarizes findings
model:
  id: claude-sonnet-4-20250514
  provider: anthropic
  settings:
    temperature: 0.3
    max_tokens: 4096
  fallback:
    id: gpt-4o
    provider: openai

tools:
  - name: web_search
    description: Search the web for information
    inputSchema:
      type: object
      required: [query]
      properties:
        query: { type: string }

mcp:
  - name: filesystem
    transport: stdio
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "./data"]

context:
  - file: "./docs/research-guidelines.md"
```

See the full [intermediate example](examples/intermediate.yaml).

</details>

<details>
<summary><strong>Add guardrails, governance, and compliance</strong></summary>

```yaml
name: financial-compliance-agent
description: Reviews transactions for regulatory compliance
model:
  id: claude-sonnet-4-20250514
  settings: { temperature: 0.1 }

instructions:
  system: >
    You are a financial compliance reviewer. Analyze transactions
    for regulatory violations. Never provide legal advice.
  persona:
    role: Senior Compliance Analyst
    tone: formal
    expertise: [SEC regulations, AML/KYC, SOX compliance]

guardrails:
  behavioral:
    - Never state that a transaction is definitively legal or illegal
    - Always recommend human review for risk scores above 70
  prohibited_actions:
    - Approving transactions above $50,000 without escalation
    - Modifying transaction records

governance:
  data_classification: confidential
  pii_handling: processes
  compliance_frameworks: [SOC2, GDPR, SOX, AML]
  risk_level: high
```

See the full [enterprise example](examples/enterprise.yaml).

</details>

<details>
<summary><strong>Compose multi-agent workflows</strong></summary>

```yaml
kind: compose
name: content-pipeline
description: Research, draft, and review articles

agents:
  - ref: "@acme/research-agent:^1.0.0"
    role: researcher
  - ref: "@acme/draft-writer:^2.1.0"
    role: writer
  - ref: "@acme/editorial-reviewer:^1.3.0"
    role: reviewer

workflow:
  type: sequential
  steps:
    - agent: researcher
    - agent: writer
      input_from: researcher
    - agent: reviewer
      input_from: writer
```

See the full [compose example](examples/agent-compose.yaml).

</details>

## Key Design Principles

- **Progressive disclosure** — 3 fields for hello world, infinite depth for enterprise. A weekend project doesn't pay the tax of enterprise concerns.
- **MCP-native** — Tools use the [MCP](https://modelcontextprotocol.io/) `Tool` interface directly. MCP servers are first-class citizens.
- **Framework-neutral** — Works with any runtime. Framework-specific config lives in `extensions.*`, never in the core schema.
- **Standards-aligned** — JSON Schema everywhere. Semver versioning. `@scope/name:version` references. Familiar patterns from npm, Docker Compose, and GitHub Actions.

## Packages

| Package | Description |
|---------|-------------|
| [`@automagent/schema`](packages/schema/) | JSON Schema, TypeScript types, and Ajv validator |
| [`automagent`](packages/cli/) | CLI: init, validate, run, import, push, pull, search, diff |

## Quick Start

```bash
# Install the CLI
npm install -g automagent

# Create a new agent definition
automagent init

# Validate it
automagent validate

# Run it interactively (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
automagent run
```

The CLI auto-detects the provider from the model name — `claude-*` uses Anthropic, `gpt-*` uses OpenAI.

## Import from Other Frameworks

Convert existing agent definitions to `agent.yaml`:

```bash
automagent import crew_config.yaml            # CrewAI (auto-detected)
automagent import assistant.json --format openai   # OpenAI Assistants
```

Unmapped fields are preserved under `extensions.<framework>`. Supported formats: **CrewAI**, **OpenAI Assistants**, **LangChain**.

## Hub

Push, pull, and search agents on the [Automagent Hub](https://hub.automagent.dev):

```bash
automagent push --scope @myteam
automagent pull @myteam/my-agent
automagent search "compliance agent"
automagent search --tags analytics,finance
automagent diff @myteam/my-agent              # Compare local vs. hub version
```

## Editor Support

Add this comment as the first line of your `agent.yaml` for schema validation and autocomplete in VS Code, JetBrains, and any editor with YAML language server support:

```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/automagent-ai/automagent/main/packages/schema/src/v1.schema.json
```

## Documentation

- [Specification](docs/spec.md) — Full field reference, type definitions, and design rationale
- [Examples](examples/) — Minimal, intermediate, enterprise, and compose examples
- [Versioning Policy](VERSIONING.md) — Semver rules for schema and CLI changes

## Development

```bash
npm install           # Install all workspace dependencies
npm run build         # Build all packages (schema first, then CLI)
npm run test          # Run all tests
npm run lint          # Type-check all packages
```

Build or test a single package:

```bash
npm run build --workspace=packages/schema
npm run test --workspace=packages/cli
```

## License

Apache-2.0
