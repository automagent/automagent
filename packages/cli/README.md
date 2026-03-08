# @automagent/cli

The CLI toolkit for the [automagent](https://github.com/automagent/automagent) agent definition standard. Define AI agents in YAML, validate them, run them interactively, and import from CrewAI and OpenAI formats.

## Install

```bash
npm install -g @automagent/cli
```

To run agents, install the SDK for your provider:

```bash
# For Claude models
npm install @anthropic-ai/sdk

# For GPT models
npm install openai
```

## Quick Start

```bash
# Create a new agent definition
automagent init

# Validate it
automagent validate

# Run it interactively
export ANTHROPIC_API_KEY=sk-...
automagent run
```

## Commands

### `automagent init`

Creates a new `agent.yaml` definition file with an interactive wizard.

```bash
automagent init                  # Interactive prompts
automagent init --quick          # Use defaults
automagent init --quick --name my-bot --model gpt-4o
automagent init --force          # Overwrite existing file
```

### `automagent validate`

Validates an agent definition against the schema with four checks: schema validation, model pinning, secret detection, and context file existence.

```bash
automagent validate              # Validates ./agent.yaml
automagent validate path/to/agent.yaml
```

### `automagent run`

Runs an agent interactively in the terminal. The provider is auto-detected from the model name (`claude-*` uses Anthropic, `gpt-*` uses OpenAI).

```bash
automagent run                   # Run ./agent.yaml
automagent run path/to/agent.yaml
automagent run --model claude-sonnet-4-20250514  # Override model
```

Requires the appropriate API key environment variable (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`).

### `automagent import`

Converts agent definitions from other frameworks into automagent format.

```bash
automagent import crew_config.yaml                  # Auto-detect format
automagent import assistant.json --format openai     # Specify format
automagent import config.yaml --force                # Overwrite output
```

**Supported formats:**

| Format | Input | Detection |
|--------|-------|-----------|
| CrewAI | YAML with `role` + `goal` + `backstory` | Auto |
| OpenAI Assistants | JSON with `instructions` + `model` | Auto |

Unmapped fields are preserved under `extensions.<framework>` in the output. A `# TODO: Review` comment is added to fields that may need manual adjustment.

## Agent Definition

Agents are defined in YAML conforming to `@automagent/schema`:

```yaml
# yaml-language-server: $schema=https://automagent.dev/schema/v1.json
name: my-agent
description: A helpful research assistant
model: claude-sonnet-4-20250514
instructions: You are a research assistant that helps find and summarize information.
tools:
  - name: web_search
    description: Search the web for information
    inputSchema:
      type: object
      properties:
        query:
          type: string
          description: The search query
```

The `model` field accepts any model identifier. The CLI auto-detects the provider, or you can use the object form:

```yaml
model:
  id: claude-sonnet-4-20250514
  provider: anthropic
```

## Development

```bash
npm install
npm run build       # Build with tsup
npm run dev         # Watch mode
npm run test        # Run tests
npm run lint        # Type-check
```

## License

Apache-2.0
