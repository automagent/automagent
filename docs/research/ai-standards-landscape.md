# AI Agent Standards Landscape: Research & Recommendations for Automagent

**Date:** 2026-03-07
**Purpose:** Guide the design of an agent definition schema for automagent.dev by analyzing existing standards.

---

## Table of Contents

1. [MCP (Model Context Protocol)](#1-mcp-model-context-protocol)
2. [OpenAI Agents SDK / Responses API](#2-openai-agents-sdk--responses-api)
3. [Google A2A (Agent-to-Agent)](#3-google-a2a-agent-to-agent)
4. [Open Agent Protocol (OAP)](#4-open-agent-protocol-oap)
5. [Tool/Function Schema Comparison](#5-toolfunction-schema-comparison)
6. [I/O and Communication Schemas](#6-io-and-communication-schemas)
7. [Recommendations for Automagent](#7-recommendations-for-automagent)

---

## 1. MCP (Model Context Protocol)

**Spec revision:** 2025-03-26
**Source of truth:** [schema.ts](https://github.com/modelcontextprotocol/specification/blob/main/schema/2025-03-26/schema.ts)
**Transport:** JSON-RPC 2.0 over stdio or HTTP (Streamable HTTP)

### What MCP Is

MCP is a **tool/resource exposure protocol**, not an agent definition protocol. It standardizes how an LLM application (host/client) connects to external servers that provide tools, resources, and prompts. The architecture has three layers:

- **Host** -- the LLM application (e.g., Claude Desktop, an IDE)
- **Client** -- a connector within the host that manages one server connection
- **Server** -- a service providing tools, resources, and prompts

### Key Schema Definitions

#### Tool

```typescript
interface Tool {
  name: string;                    // Unique identifier
  description?: string;            // Human-readable description
  inputSchema: {                   // JSON Schema for parameters
    type: "object";
    properties?: { [key: string]: object };
    required?: string[];
  };
  annotations?: ToolAnnotations;
}

interface ToolAnnotations {
  title?: string;                  // Human-readable title
  readOnlyHint?: boolean;          // Tool doesn't modify state
  destructiveHint?: boolean;       // Tool may destructively modify state
  idempotentHint?: boolean;        // Repeated calls have same effect
  openWorldHint?: boolean;         // Tool interacts with external entities
}
```

#### Resource

```typescript
interface Resource {
  uri: string;                     // Unique resource URI
  name: string;                    // Human-readable name
  description?: string;
  mimeType?: string;
  annotations?: Annotations;
  size?: number;                   // Size in bytes
}

interface ResourceTemplate {
  uriTemplate: string;             // URI template (RFC 6570)
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: Annotations;
}
```

#### Server Capabilities

```typescript
interface ServerCapabilities {
  experimental?: { [key: string]: object };
  logging?: object;
  completions?: object;
  prompts?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  tools?: { listChanged?: boolean };
}
```

#### Content Types (Tool Results)

```typescript
interface TextContent   { type: "text";  text: string;  annotations?: Annotations; }
interface ImageContent  { type: "image"; data: string;  mimeType: string; annotations?: Annotations; }
interface AudioContent  { type: "audio"; data: string;  mimeType: string; annotations?: Annotations; }
```

### Relationship to Automagent

MCP defines **what an agent can use** (tools, resources), not **what an agent is**. An automagent agent definition should:

- Reference MCP servers as tool sources (by transport config)
- Not re-invent tool schemas -- use MCP's `Tool` interface directly
- Allow agents to declare which MCP servers they connect to

Example configuration pattern (from OpenAI Agents SDK and Claude Desktop):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
      "env": {}
    },
    "remote-api": {
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${API_KEY}" }
    }
  }
}
```

---

## 2. OpenAI Agents SDK / Responses API

**Source:** [openai-agents-python](https://openai.github.io/openai-agents-python/)

### Agent Definition

The OpenAI Agents SDK defines agents as Python dataclasses with these key fields:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Agent identifier |
| `instructions` | `str \| Callable` | System prompt |
| `model` | `str \| Model` | Model ID (default: `"gpt-4.1"`) |
| `model_settings` | `ModelSettings` | Temperature, top_p, etc. |
| `tools` | `list[Tool]` | Available tools |
| `mcp_servers` | `list[MCPServer]` | MCP server connections |
| `handoffs` | `list[Agent \| Handoff]` | Delegation targets |
| `input_guardrails` | `list[InputGuardrail]` | Pre-processing validation |
| `output_guardrails` | `list[OutputGuardrail]` | Post-processing validation |
| `output_type` | `type \| None` | Structured output schema |
| `tool_use_behavior` | various | Controls post-tool-call behavior |
| `hooks` | `AgentHooks` | Lifecycle event callbacks |

### Tool Types

The SDK supports multiple tool categories:
1. **Function tools** -- Python functions with auto-generated JSON Schema via Pydantic
2. **MCP server tools** -- Dynamically loaded from MCP servers
3. **Agents as tools** -- Other agents callable as tools (via `agent.as_tool()`)
4. **Hosted tools** -- OpenAI-hosted tools (code_interpreter, file_search, web_search)

### MCP Integration

MCP servers are configured via transport classes:

- `MCPServerStdio(name, params={command, args})` -- local subprocess
- `MCPServerStreamableHttp(name, params={url, headers, timeout})` -- remote HTTP
- `HostedMCPTool` -- executed on OpenAI infrastructure

Agent-level `mcp_config` controls schema conversion and tool filtering.

### OpenAI Function Calling Schema (Chat/Responses API)

```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get current weather for a location",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "City name or zip code"
        }
      },
      "required": ["location"]
    }
  }
}
```

Control via `tool_choice`: `"auto"`, `"none"`, `"required"`, or `{"type": "function", "function": {"name": "..."}}`.

### Handoffs

Handoffs are a first-class concept: agents can delegate to other agents. This is relevant for multi-agent orchestration in automagent.

---

## 3. Google A2A (Agent-to-Agent)

**Spec:** [a2a-protocol.org](https://a2a-protocol.org/latest/specification/)
**Schema format:** Protocol Buffers ([a2a.proto](https://github.com/google/A2A/blob/main/specification/a2a.proto))
**Transport:** JSON-RPC 2.0 over HTTP(S), with SSE for streaming

### What A2A Is

A2A is a **cross-agent communication protocol** enabling opaque agents to collaborate. Unlike MCP (which exposes tools to an LLM), A2A enables agent-to-agent task delegation without exposing internal implementation.

### Agent Card (Discovery)

The Agent Card is A2A's most relevant concept for automagent -- it is a JSON metadata document describing an agent's identity, capabilities, and endpoint.

```protobuf
message AgentCard {
  string name = 1;                              // Required
  string description = 2;                       // Required
  repeated AgentInterface supported_interfaces = 3; // Required
  AgentProvider provider = 4;
  string version = 5;                           // Required
  string documentation_url = 6;
  AgentCapabilities capabilities = 7;           // Required
  map<string, SecurityScheme> security_schemes = 8;
  repeated SecurityRequirement security_requirements = 9;
  repeated string default_input_modes = 10;     // MIME types
  repeated string default_output_modes = 11;    // MIME types
  repeated AgentSkill skills = 12;              // Required
  repeated AgentCardSignature signatures = 13;
  string icon_url = 14;
}
```

#### AgentSkill

```protobuf
message AgentSkill {
  string id = 1;                                // Required unique ID
  string name = 2;                              // Required human-readable name
  string description = 3;                       // Required
  repeated string tags = 4;                     // Required keywords
  repeated string examples = 5;                 // Example prompts
  repeated string input_modes = 6;              // Override MIME types
  repeated string output_modes = 7;             // Override MIME types
  repeated SecurityRequirement security_requirements = 8;
}
```

#### AgentCapabilities

```protobuf
message AgentCapabilities {
  bool streaming = 1;
  bool push_notifications = 2;
  repeated AgentExtension extensions = 3;
  bool extended_agent_card = 4;
}
```

#### AgentInterface

```protobuf
message AgentInterface {
  string url = 1;                // Required endpoint URL
  string protocol_binding = 2;  // Required (e.g., "jsonrpc+http")
  string tenant = 3;            // Optional multi-tenant path
  string protocol_version = 4;  // Required
}
```

### Task Lifecycle

Tasks are the fundamental unit of work in A2A:

```
submitted -> working -> completed
                    -> failed
                    -> canceled
                    -> input_required (interrupted, waiting for user)
                    -> auth_required (interrupted, waiting for auth)
```

```protobuf
message Task {
  string id = 1;              // Server-generated UUID
  string context_id = 2;      // Groups related interactions
  TaskStatus status = 3;      // Current state + message + timestamp
  repeated Artifact artifacts = 4;
  repeated Message history = 5;
  google.protobuf.Struct metadata = 6;
}
```

### Message & Part

```protobuf
message Message {
  string message_id = 1;
  string context_id = 2;
  string task_id = 3;
  Role role = 4;               // user | agent
  repeated Part parts = 5;
  google.protobuf.Struct metadata = 6;
  repeated string extensions = 7;
  repeated string reference_task_ids = 8;
}

message Part {
  string text = 1;
  bytes raw = 2;               // Binary content
  string url = 3;              // Content URL
  google.protobuf.Value data = 4; // Structured JSON
  google.protobuf.Struct metadata = 5;
  string filename = 6;
  string media_type = 7;       // MIME type
}
```

### A2A RPC Methods

| Method | HTTP | Description |
|--------|------|-------------|
| `SendMessage` | `POST /message:send` | Send a message, get task back |
| `SendStreamingMessage` | `POST /message:stream` | Stream response via SSE |
| `GetTask` | `GET /tasks/{id}` | Retrieve task status |
| `ListTasks` | `GET /tasks` | List tasks |
| `CancelTask` | `POST /tasks/{id}:cancel` | Cancel a task |
| `SubscribeToTask` | `GET /tasks/{id}:subscribe` | Stream task updates |

---

## 4. Open Agent Protocol (OAP)

**Status:** Very early stage (as of March 2026)
**GitHub:** [open-agent-protocol](https://github.com/open-agent-protocol)

The Open Agent Protocol organization has two repositories:
- `spec` -- formal specification document (1 commit, essentially empty)
- `reference-implementation` -- registry service MVP

**Assessment:** OAP is not yet a viable standard to align with. It appears to be in ideation phase with no published schema. Monitor but do not depend on it.

---

## 5. Tool/Function Schema Comparison

### Side-by-Side: Tool Definitions

| Aspect | MCP | OpenAI Function Calling | A2A |
|--------|-----|------------------------|-----|
| **Identifier** | `name: string` | `function.name: string` | N/A (uses skills, not tools) |
| **Description** | `description?: string` | `function.description: string` | N/A |
| **Parameters** | `inputSchema: JSONSchema` | `function.parameters: JSONSchema` | N/A |
| **Wrapper** | Flat object | `{type: "function", function: {...}}` | N/A |
| **Annotations** | `annotations.readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` | None | N/A |
| **Output schema** | Not defined (returns content array) | Not defined at tool level | N/A |

**Key insight:** MCP and OpenAI both use **JSON Schema** for tool parameter definitions. The core schema is identical -- only the wrapper differs. A2A does not define tools; it defines skills at the agent level, because A2A treats agents as opaque.

### Recommended Approach for Automagent

Do **not** define a new tool schema. Instead:

1. Use MCP's `Tool` interface as the canonical tool definition format
2. Provide a trivial mapping to/from OpenAI's function calling format (strip/add the `{type: "function", function: {...}}` wrapper)
3. For agent-level capability descriptions (what an agent can do, not how), use A2A-style skills

---

## 6. I/O and Communication Schemas

### Content/Part Types Across Protocols

| Protocol | Text | Image | Audio | File | Structured Data |
|----------|------|-------|-------|------|-----------------|
| **MCP** | `{type:"text", text}` | `{type:"image", data, mimeType}` | `{type:"audio", data, mimeType}` | `{type:"resource", resource:{uri, text/blob}}` | Via text or resource |
| **A2A** | `Part.text` | `Part.raw` + `media_type` | `Part.raw` + `media_type` | `Part.url` or `Part.raw` + `filename` | `Part.data` (JSON Value) |
| **OpenAI** | String content | Image URLs or base64 | Audio input_audio | File IDs | JSON via `output_type` |

### Recommended I/O Format

**JSON Schema** is the clear winner for defining inputs and outputs:

- All three major protocols use it for parameter/capability definitions
- It is language-agnostic and well-tooled
- Pydantic, Zod, and similar libraries generate/validate it natively

For content types within messages, adopt a **Part-based model** similar to both MCP and A2A:

```json
{
  "type": "text|image|audio|file|data",
  "text": "...",
  "data": "base64 or URL",
  "mimeType": "...",
  "metadata": {}
}
```

---

## 7. Recommendations for Automagent

### Tier 1: Explicitly Align With

These standards are mature, widely adopted, and directly relevant.

| Standard | What to Adopt | How |
|----------|--------------|-----|
| **MCP Tool schema** | Tool definition format (`name`, `description`, `inputSchema` as JSON Schema, `annotations`) | Use as canonical tool representation |
| **MCP Server config** | Transport configuration (`command`/`args` for stdio, `url`/`headers` for HTTP) | Reference in agent definition for tool sources |
| **A2A Agent Card** | Agent metadata structure (`name`, `description`, `version`, `skills`, `capabilities`, `provider`, `input_modes`, `output_modes`) | Model the automagent agent definition after Agent Card |
| **JSON Schema** | Parameter and output type definitions | Use everywhere types are defined |
| **A2A AgentSkill** | High-level capability descriptions (`id`, `name`, `description`, `tags`, `examples`) | Use for agent capability discovery |

### Tier 2: Reference but Don't Fully Adopt

| Standard | What to Reference | Why Not Full Adoption |
|----------|------------------|----------------------|
| **OpenAI function calling format** | Document mapping from automagent tools to OpenAI format | It's a wrapper around JSON Schema; the core is identical to MCP |
| **A2A Task lifecycle** | Reference for async agent-to-agent interactions | Automagent is a registry/definition layer, not a runtime protocol |
| **A2A RPC methods** | Reference for agent communication patterns | Same as above -- useful for runtime, not definition |
| **OpenAI Agents SDK structure** | `instructions`, `model`, `handoffs`, `guardrails` concepts | SDK-specific; extract the concepts, not the implementation |

### Tier 3: Monitor / Ignore

| Standard | Status | Action |
|----------|--------|--------|
| **Open Agent Protocol (OAP)** | Essentially empty spec | Monitor quarterly |
| **Protocol Buffers** (as schema format) | A2A uses protobuf, but JSON is dominant in the ecosystem | Ignore for now; JSON Schema is the lingua franca |

### Proposed Automagent Agent Schema

Based on the research, here is a recommended schema that aligns with existing standards:

```jsonc
{
  // === Identity (aligned with A2A Agent Card) ===
  "name": "my-agent",                        // Required. Unique identifier
  "displayName": "My Agent",                 // Human-readable name
  "description": "What this agent does",     // Required
  "version": "1.0.0",                        // Semver
  "iconUrl": "https://...",
  "documentationUrl": "https://...",

  // === Provider (aligned with A2A AgentProvider) ===
  "provider": {
    "organization": "Acme Corp",
    "url": "https://acme.com"
  },

  // === Model Configuration (from OpenAI Agents SDK) ===
  "model": {
    "id": "claude-sonnet-4-20250514",
    "provider": "anthropic",
    "settings": {
      "temperature": 0.7,
      "maxTokens": 4096
    }
  },

  // === Instructions (from OpenAI Agents SDK) ===
  "instructions": "You are a helpful assistant that...",

  // === Skills (aligned with A2A AgentSkill) ===
  "skills": [
    {
      "id": "data-analysis",
      "name": "Data Analysis",
      "description": "Analyze datasets and produce insights",
      "tags": ["analytics", "data", "csv"],
      "examples": ["Analyze this CSV file", "What trends do you see?"],
      "inputModes": ["text/plain", "text/csv"],
      "outputModes": ["text/plain", "application/json"]
    }
  ],

  // === Tools (aligned with MCP Tool schema) ===
  "tools": [
    {
      "name": "query_database",
      "description": "Execute a SQL query against the analytics database",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "SQL query" }
        },
        "required": ["query"]
      },
      "annotations": {
        "readOnlyHint": true,
        "idempotentHint": true
      }
    }
  ],

  // === MCP Servers (aligned with MCP config conventions) ===
  "mcpServers": {
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"],
      "env": {}
    },
    "api-server": {
      "transport": "streamable-http",
      "url": "https://api.example.com/mcp",
      "headers": {}
    }
  },

  // === I/O Schema (JSON Schema, universal) ===
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "context": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["query"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "answer": { "type": "string" },
      "confidence": { "type": "number" }
    }
  },

  // === Capabilities (aligned with A2A AgentCapabilities) ===
  "capabilities": {
    "streaming": true,
    "multimodal": false,
    "handoffs": false
  },

  // === Handoffs (concept from OpenAI Agents SDK) ===
  "handoffs": [
    {
      "agentRef": "automagent://specialist-agent",
      "description": "Delegate complex analysis tasks"
    }
  ],

  // === Interfaces (aligned with A2A AgentInterface) ===
  "interfaces": [
    {
      "url": "https://my-agent.example.com",
      "protocol": "a2a",
      "protocolVersion": "1.0"
    },
    {
      "url": "https://my-agent.example.com/mcp",
      "protocol": "mcp",
      "protocolVersion": "2025-03-26"
    }
  ],

  // === Security (aligned with A2A SecurityScheme) ===
  "security": {
    "schemes": {
      "apiKey": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    },
    "requirements": [{"apiKey": []}]
  },

  // === Metadata ===
  "tags": ["analytics", "data"],
  "license": "MIT",
  "sourceUrl": "https://github.com/acme/my-agent"
}
```

### Risk Assessment: Coupling to Emerging Standards

| Risk | Severity | Mitigation |
|------|----------|------------|
| MCP schema changes breaking tool definitions | **Low** -- MCP tool schema is stable and simple | Pin to spec revision (e.g., `2025-03-26`) |
| A2A Agent Card schema changes | **Medium** -- A2A moved from JSON to protobuf and is still evolving | Adopt concepts (skills, capabilities) but use own field names where divergence is likely |
| OpenAI changes function calling format | **Low** -- JSON Schema core won't change | Only reference the mapping, don't embed their wrapper |
| New standard emerges that supersedes all | **Medium** -- the space is still consolidating | Keep automagent schema modular; use `interfaces` array to declare protocol support without baking in any single protocol |
| Tight coupling to any single provider | **High** if done | Keep `model` as a reference, not a hard dependency. Support multiple model providers. |

### Key Principles

1. **JSON Schema is the universal language.** Every protocol uses it for parameters. Automagent should too.

2. **MCP is for tools, A2A is for agents.** MCP defines what tools look like. A2A defines what agents look like from the outside. Automagent needs both: internal composition (tools via MCP) and external description (Agent Card concepts from A2A).

3. **Be a superset, not a subset.** The automagent schema should be able to express everything in an A2A Agent Card or an MCP server config, plus automagent-specific fields (model config, instructions, guardrails). It should be possible to generate an A2A Agent Card or MCP config from an automagent agent definition.

4. **Protocol support via interfaces, not inheritance.** Rather than baking A2A or MCP deeply into the schema, declare protocol support in an `interfaces` array. This allows agents to support multiple protocols and makes the schema resilient to protocol evolution.

5. **Separate definition from runtime.** Automagent defines agents (what they are, what they can do). MCP and A2A define runtime communication (how they talk). Keep these concerns separate.
