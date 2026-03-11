---
name: validate-agent
description: Validate an agent.yaml file against the automagent schema. Use when checking agent definitions for errors.
---

# Validate Agent Definition

Validate an `agent.yaml` file against the automagent schema.

## Steps

1. Find `agent.yaml` in the current directory (or ask the user for the path)

2. If `automagent` CLI is installed, run:
   ```bash
   automagent validate agent.yaml
   ```

3. If not installed, read the file and check:
   - Required fields: `name`, `description`
   - Name matches pattern: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$` (max 128 chars)
   - No API keys or secrets in string values
   - All referenced context files exist
   - Model is pinned to a specific version (not just `gpt-4` or `claude-sonnet`)

4. Report results with actionable suggestions for any issues found.
