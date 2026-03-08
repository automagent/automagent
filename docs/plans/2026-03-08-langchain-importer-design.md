# Design: LangChain Importer

**Date:** 2026-03-08
**Status:** Approved
**Package:** @automagent/cli

## Context

The Phase 1 PRD calls for three framework importers: CrewAI, OpenAI, and LangChain. CrewAI and OpenAI are complete. This adds the LangChain importer following the same patterns.

## Input Format

LangChain has no single canonical config file. We target a pragmatic JSON format capturing the common fields from `initialize_agent()` / `create_react_agent()` / serialized LangChain agent configs:

```json
{
  "name": "research-assistant",
  "agent_type": "react",
  "llm": {
    "model_name": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 4096
  },
  "system_message": "You are a research assistant.",
  "tools": [
    { "name": "search", "description": "Web search", "args_schema": { "type": "object", "properties": { "q": { "type": "string" } } } }
  ],
  "memory": { "type": "buffer", "k": 10 },
  "tags": ["research", "analysis"],
  "verbose": true
}
```

## Field Mappings

| LangChain | Automagent | Notes |
|-----------|-----------|-------|
| `name` / `metadata.name` / `agent_type` | `name` (slugified) | Fallback chain for name resolution |
| `prompt` / `system_message` | `instructions` | First non-empty wins |
| `llm` (string) | `model` | Direct |
| `llm.model_name` / `llm.model` | `model.id` | Extract from object |
| `llm.temperature`, `llm.max_tokens` | `model.settings` | Only when llm is object with extra settings |
| `model` (top-level string) | `model` | Alternative to llm |
| `tools` (strings) | `tools: [{name}]` | Same as CrewAI |
| `tools` (objects) | `tools: [{name, description, inputSchema}]` | `args_schema` -> `inputSchema` |
| `tags` | `metadata.tags` | Direct |
| Everything else | `extensions.langchain.*` | agent_type, memory, verbose, callbacks, etc. |

## Format Detection

JSON file with (`prompt` OR `system_message`) AND/OR (`agent_type` OR `llm` as object with `model_name`). This distinguishes from OpenAI (which uses `instructions` + `model`).

## Files Changed

1. **New:** `packages/cli/src/importers/langchain.ts` - Importer function
2. **Edit:** `packages/cli/src/commands/import.ts` - Add langchain to format detection + switch
3. **Edit:** `packages/cli/src/commands/__tests__/commands.test.ts` - ~12 unit tests
4. **Edit:** `packages/cli/src/commands/__tests__/schema-contract.test.ts` - Contract tests for langchain importer output
