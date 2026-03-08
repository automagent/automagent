# @automagent/schema

JSON Schema definition, TypeScript types, and validator for [Automagent](https://github.com/automagent/automagent) agent definitions.

## Installation

```bash
npm install @automagent/schema
```

## Usage

### Validate an agent definition

```ts
import { validate } from '@automagent/schema';

const result = validate({
  name: 'my-agent',
  model: { provider: 'anthropic', name: 'claude-sonnet-4-5-20250514' },
  instructions: 'You are a helpful assistant.',
});

if (!result.valid) {
  console.error(result.errors);
}
```

### TypeScript types

```ts
import type { AgentDefinition, ModelConfig, ToolDefinition } from '@automagent/schema';
```

### Access the raw JSON Schema

```ts
import schema from '@automagent/schema/v1.schema.json';
```

## What's included

- `v1.schema.json` — JSON Schema for `agent.yaml`
- `compose.schema.json` — JSON Schema for agent composition
- TypeScript types: `AgentDefinition`, `ModelConfig`, `ToolDefinition`, `ValidationResult`
- `validate()` — Ajv-based validator function

## License

Apache-2.0
