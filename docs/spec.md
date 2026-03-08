# Agent Definition Specification v1

**Status:** Draft
**Schema URL:** `https://automagent.dev/schema/v1.json`
**Compose Schema URL:** `https://automagent.dev/schema/compose/v1.json`

---

## 1. Overview

The Agent Definition Spec defines `agent.yaml` -- a standard file format for describing AI agents. It defines a portable, declarative, framework-neutral standard for describing AI agents — YAML for humans, validated by JSON Schema for machines.

An agent definition captures what an agent is (model, instructions, tools), how it behaves (guardrails, governance), and how it relates to other agents (composition, dependencies). The file is YAML for humans and validated by JSON Schema for machines.

---

## 2. Design Principles

1. **3 required fields for hello world, infinite depth for enterprise.** Progressive disclosure, not progressive complexity. A weekend project should not pay the tax of enterprise concerns.

2. **`agent.yaml` -- YAML for humans, JSON Schema for machines.** Not branded, not hidden, not a new format. YAML because every developer has muscle memory from GitHub Actions, Kubernetes, and docker-compose. JSON Schema because it provides type safety and editor autocomplete.

3. **MCP-aligned tools, A2A-aligned discovery.** Don't reinvent standards. Reference them. Tools use the MCP `Tool` interface directly. Agent metadata aligns with A2A Agent Card concepts.

4. **Same field, scaling value types.** `instructions` is a string OR an object. `model` is a string OR an object. No separate field names for simple vs. complex. The field grows with your needs.

5. **Framework-neutral core, framework-specific extensions.** Any runtime can read the core fields. Framework-specific configuration lives in `extensions.*` and never pollutes the shared namespace.

6. **Hub concerns stay in the hub.** Downloads, ratings, approval status are API responses, never in the YAML file. Author-declared fields go in `agent.yaml`. Hub-computed fields go in the API. This is analogous to `package.json` vs. the npm registry API response.

7. **Open-source the spec, monetize the platform.** The schema is an open standard. The hosted hub with governance, testing, and enterprise features is the product.

---

## 3. File Format

**Filename:** `agent.yaml` (single agent) or `agent-compose.yaml` (multi-agent composition)
**Format:** YAML 1.2
**Validation:** JSON Schema (Draft-07), published at the schema URLs above
**Editor support:** Add this as the first line for autocomplete:

```yaml
# yaml-language-server: $schema=https://automagent.dev/schema/v1.json
```

---

## 4. Progressive Disclosure

The spec is designed around three tiers. Each tier adds concepts without invalidating prior definitions.

### Tier 1: Minimal (Weekend Project)

```yaml
name: my-agent
description: Answers questions about our codebase
model: claude-sonnet
```

Three fields. One concept: "give the agent a name, a purpose, and a brain." See [minimal.yaml](examples/minimal.yaml).

### Tier 2: Intermediate (Team Tool)

Adds model settings, tools, MCP integrations, context sources, and metadata. See [intermediate.yaml](examples/intermediate.yaml).

New concepts introduced:
- **`model` as object** -- Same field, richer value. Pin a specific model version and configure settings.
- **`tools`** -- Inline tool definitions with MCP-compatible `inputSchema`.
- **`mcp`** -- MCP server references for tool discovery.
- **`context`** -- Static knowledge the agent should have. Files or URLs.
- **`metadata`** -- Organizational concerns like ownership and tags.

### Tier 3: Enterprise (Production Agent)

Adds governance, guardrails, evaluation, triggers, environment overrides, dependencies, and framework extensions. See [enterprise.yaml](examples/enterprise.yaml).

New concepts introduced:
- **`instructions` as object** -- Structured system prompt with persona configuration.
- **`inputs`/`outputs`** -- JSON Schema for structured I/O contracts.
- **`guardrails`** -- Input/output validation, behavioral rules, prohibited actions.
- **`governance`** -- Data classification, PII handling, compliance frameworks.
- **`evaluation`** -- Test datasets and behavioral assertions.
- **`triggers`** -- Events and schedules that activate the agent.
- **`environments`** -- Per-environment overrides (staging, production).
- **`extensions`** -- Framework-specific configuration.

---

## 5. Field Reference: Agent Definition

### 5.1 Required Fields

| Field | Type | Validation | Description |
|---|---|---|---|
| `name` | `string` | Pattern: `^[a-z0-9][a-z0-9-]*$`, max 128 chars | Machine-readable slug. Lowercase alphanumeric and hyphens only. |
| `description` | `string` | Non-empty | Human-readable description of what the agent does. |
| `model` | `string \| ModelConfig` | String or object with required `id` | Model identifier or full model configuration. |

### 5.2 Core Optional Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `apiVersion` | `string` | `"v1"` | Schema version for evolution. |
| `kind` | `"agent" \| "team"` | `"agent"` | Definition type. |
| `version` | `string` | `"0.1.0"` | Semver version of this agent definition. |
| `instructions` | `string \| InstructionsConfig` | `""` | System prompt (string) or structured instructions (object with `system` and `persona`). |
| `tools` | `ToolDefinition[]` | `[]` | Inline tool definitions following the MCP `Tool` interface. |
| `mcp` | `McpServerConfig[]` | `[]` | MCP server references for tool discovery. |
| `context` | `ContextSource[]` | `[]` | Static knowledge sources: files, URLs, or agent references. |
| `inputs` | `object` | any | JSON Schema for structured input. Contains a `schema` property. |
| `outputs` | `object` | any | JSON Schema for structured output. Contains a `schema` property. |
| `metadata` | `Metadata` | `{}` | Owner, tags, categories, author, license, repository, changelog. |

### 5.3 Governance Fields

| Field | Type | Description |
|---|---|---|
| `guardrails` | `Guardrails` | Input/output validation rules, behavioral constraints, prohibited actions, and approval requirements. |
| `governance` | `Governance` | Data classification, PII handling, compliance frameworks, risk level, and authorized use constraints. |
| `evaluation` | `object` | Test dataset path, minimum passing score, and behavioral assertions. |

### 5.4 Operational Fields

| Field | Type | Description |
|---|---|---|
| `triggers` | `Trigger[]` | Events and cron schedules that activate the agent. |
| `environments` | `object` | Per-environment overrides. Keys are environment names (e.g., `staging`), values are partial agent definitions that override the base. |
| `dependencies` | `object` | Agent dependency declarations with `ref`, `role`, `required`, and `interaction` mode. |
| `extensions` | `object` | Framework-specific configuration under namespaced keys (e.g., `crewai`, `langgraph`, `openai_agents`). |

---

## 6. Type Definitions

### ModelConfig

```
{
  id: string            (required) Model identifier
  provider?: string     Model provider (e.g., "anthropic", "openai")
  settings?: {
    temperature?: number
    max_tokens?: integer
    ...                 Additional model-specific settings
  }
  fallback?: {
    id: string
    provider?: string
  }
  compatible?: Array<{
    id: string
    score?: number      Compatibility score (0-100)
  }>
}
```

### InstructionsConfig

```
{
  system?: string | { file: string }    System prompt as text or file reference
  persona?: {
    role?: string
    tone?: string
    expertise?: string[]
  }
}
```

### ToolDefinition (MCP-aligned)

```
{
  name: string            (required) Tool name
  description?: string    Human-readable description
  inputSchema?: object    JSON Schema for tool parameters
  annotations?: {
    readOnlyHint?: boolean
    idempotentHint?: boolean
    destructiveHint?: boolean
    openWorldHint?: boolean
  }
}
```

### McpServerConfig

```
{
  name: string            (required) Server name
  transport: string       (required) "stdio" | "streamable-http"
  url?: string            URL for streamable-http transport
  command?: string        Command for stdio transport
  args?: string[]         Arguments for stdio transport
  auth?: {
    type?: string
    scope?: string
  }
}
```

### ContextSource

```
{
  file?: string    Path to a local file or glob pattern
  url?: string     URL to fetch content from
  agent?: string   Agent reference for dynamic context
}
```

### Guardrails

```
{
  input?: GuardrailRule[]
  output?: GuardrailRule[]
  behavioral?: string[]            Natural language behavioral constraints
  prohibited_actions?: string[]    Actions the agent must never take
  require_approval?: Array<{
    pattern: string
    approvers: string[]
  }>
}
```

### GuardrailRule

```
{
  name?: string
  description?: string
  action?: "block" | "warn" | "transform" | "log"
}
```

### Governance

```
{
  data_classification?: string
  pii_handling?: string
  pii_types?: string[]
  data_residency?: string[]
  compliance_frameworks?: string[]
  risk_level?: string
  authorized_use?: {
    departments?: string[]
    environments?: string[]
  }
}
```

### Trigger

```
{
  event?: string         Event name
  schedule?: string      Cron expression
  description?: string   Human-readable description
  filter?: object        Event filter conditions
}
```

### Metadata

```
{
  owner?: string
  tags?: string[]
  categories?: {
    domain?: string
    function?: string
    maturity?: string
  }
  license?: string
  author?: { name?: string, email?: string }
  repository?: string
  changelog?: string
}
```

---

## 7. Field Reference: Compose Definition

Multi-agent compositions use a separate file -- `agent-compose.yaml` -- mirroring the `docker-compose.yaml` pattern.

### Required Fields

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Machine-readable slug. Same validation as agent `name`. |
| `description` | `string` | Human-readable description. |
| `agents` | `AgentRef[]` | Agent references participating in this composition. Minimum 1. |

### Optional Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `apiVersion` | `string` | `"v1"` | Schema version. |
| `kind` | `"compose"` | `"compose"` | Must be `"compose"`. |
| `version` | `string` | `"0.1.0"` | Semver version. |
| `workflow` | `Workflow` | -- | Orchestration configuration. |
| `governance` | `object` | -- | Governance with optional `inherits_from` reference. |
| `metadata` | `object` | -- | Owner, tags, license. |

### AgentRef

```
{
  ref: string           (required) Agent reference (e.g., "@acme/legal-reviewer:^2.1.0")
  role: string          (required) Role in the composition
  description?: string  Human-readable role description
}
```

### Workflow

```
{
  type?: "sequential" | "parallel" | "router" | "hierarchical" | "dynamic"
  steps?: Array<{
    agent: string           Role name of the agent to execute
    input_from: string | string[]   Input source reference(s)
  }>
}
```

See [agent-compose.yaml](examples/agent-compose.yaml) for a complete example.

---

## 8. Standards Alignment

| Standard | How We Align | Why |
|---|---|---|
| **MCP Tools** | Use MCP's `Tool` interface directly (`name`, `description`, `inputSchema`, `annotations`) | Universal tool schema -- don't reinvent it |
| **MCP Servers** | Reference in `mcp` with transport config (`stdio` / `streamable-http`) | Native MCP support from day one |
| **A2A Agent Card** | Model agent metadata after Agent Card concepts (`skills`, `capabilities`, `interfaces`) | A2A defines how agents describe themselves for discovery |
| **JSON Schema** | Use everywhere types are defined (inputs, outputs, tool params) | Universal across all protocols |
| **OpenAI Agents SDK** | Reference concepts (`instructions`, `handoffs`, `guardrails`) without adopting SDK-specific structures | Extract patterns, not implementations |
| **Semver** | Version all agent definitions with semver | Human-readable change magnitude |
| **OCI / npm** | Use `@scope/name:version` for hub references | Proven namespace pattern |

**Key principle: Be a superset, not a subset.** It should be possible to generate an A2A Agent Card, an MCP config, or a CrewAI/OpenAI/AutoGen agent from an `agent.yaml`. The agent definition is the source of truth; framework configs are derived.

---

## 9. Cross-Framework Mapping

How `agent.yaml` fields translate to each framework:

| agent.yaml | CrewAI | OpenAI Agents | AutoGen | LangGraph |
|---|---|---|---|---|
| `name` | `role` | `name` | `name` | graph name |
| `instructions` | `goal` + `backstory` | `instructions` | `system_message` | `prompt` |
| `model` | `llm` | `model` | `model_client` | `model` |
| `tools` | `tools` | `tools` | `tools` | `tools` |
| `mcp` | -- | `mcp_servers` | -- | -- |
| `outputs.schema` | `output_pydantic` | `output_type` | -- | `state_schema` |
| `guardrails.input` | -- | `input_guardrails` | -- | `interrupt_before` |
| `guardrails.output` | task guardrails | `output_guardrails` | -- | -- |
| `dependencies.agents` | `allow_delegation` | `handoffs` | team config | graph edges |
| `instructions.persona` | `backstory` | -- | `description` | -- |
| `extensions.crewai` | native fields | -- | -- | -- |
| `extensions.langgraph` | -- | -- | -- | native fields |

---

## 10. Schema Evolution Strategy

Every file includes (or implies) an `apiVersion`:

```yaml
apiVersion: v1
```

### Compatibility Rules

- **Patch changes** (v1.x): Bug fixes to field descriptions. No structural changes.
- **Minor changes** (v1 additive): New optional fields. Existing files remain valid.
- **Major changes** (v2): Breaking changes. Migration tooling provided. Old files validated with a warning.

### Forward Compatibility

Old parsers MUST ignore unknown fields. A v1.0 parser reading a file with fields added in v1.3 must not fail -- it silently ignores what it does not understand.

### Backward Compatibility

New parsers MUST accept files missing new optional fields. A v1.3 parser reading a v1.0 file must apply defaults and validate successfully.

### Versioning for Agent Definitions

Agent definitions themselves use semver in the `version` field:

- **MAJOR**: Breaking changes to I/O schema, removal of capabilities, fundamental behavior shift.
- **MINOR**: New capabilities, new tools, expanded scope (backward-compatible).
- **PATCH**: Prompt refinements, guardrail tightening, bug fixes.

Once published, a version is immutable. No overwrites. Tags like `latest` and `stable` are mutable pointers to immutable versions.

---

## 11. Extension Namespace Rules

### Framework Extensions

Framework-specific configuration lives under `extensions.<framework>`:

```yaml
extensions:
  crewai:
    backstory: "..."
    allow_delegation: true
  langgraph:
    interrupt_before: [flag_critical]
    checkpointer: postgres
```

Rules:
- Extension namespaces are self-governed by framework maintainers.
- Unknown extensions are preserved but not validated (open-world assumption).
- Core fields always take precedence over extensions.
- Extensions must not duplicate core field semantics under a different name.

### Organization-Specific Fields

Organization-specific fields use the `x-` prefix (borrowed from OpenAPI):

```yaml
x-acme:
  cost_center: "CC-4492"
  business_unit: "commerce"
```

These fields are preserved during parsing but not validated against the core schema.

---

## 12. Implementation Phases

| Phase | Scope | Fields Included |
|---|---|---|
| 0.1 | Core MVP | `name`, `description`, `model`, `instructions`, `version` |
| 0.2 | Tools and Context | `tools` (inline + MCP), `context`, `inputs`/`outputs` |
| 0.3 | Governance | `guardrails`, `governance`, `metadata` |
| 0.4 | Testing | `evaluation`, `environments` |
| 0.5 | Composition | `agent-compose.yaml`, `kind: compose`, `dependencies`, `workflow` |
| 0.6 | Operations | `triggers`, `extensions`, `x-` custom fields |
| 1.0 | Stable Release | Full spec freeze, conformance tests, migration tooling |

Each phase adds optional sections. No phase breaks prior definitions. The 3-field hello world remains valid at v1.0.
