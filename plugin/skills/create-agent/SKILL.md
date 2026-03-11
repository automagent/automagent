---
name: create-agent
description: Create a new agent.yaml definition file using the automagent standard. Use when the user wants to define a new AI agent.
---

# Create Agent Definition

Create an `agent.yaml` file following the automagent standard. Run the CLI if available, otherwise generate the YAML directly.

## Steps

1. Ask the user for:
   - Agent name (lowercase, hyphens only, e.g. `code-reviewer`)
   - Description (what the agent does)
   - Model (optional, e.g. `claude-sonnet-4-20250514`)
   - Instructions (system prompt)

2. If `automagent` CLI is installed, run:
   ```bash
   automagent init --quick --name <name> --description "<desc>" --model <model>
   ```

3. If not installed, create `agent.yaml` directly with this structure:
   ```yaml
   # yaml-language-server: $schema=https://raw.githubusercontent.com/automagent/automagent/main/packages/schema/src/v1.schema.json
   apiVersion: v1
   name: <name>
   description: <description>
   model: <model>
   instructions: |
     <instructions>
   ```

4. Validate the file: `automagent validate` (if CLI available)

5. Suggest next steps:
   - Add tools, MCP servers, or context sources
   - Run `automagent export --target claude-code` to generate a plugin
   - Run `automagent sync` to export to all IDE formats
