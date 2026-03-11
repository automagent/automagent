---
name: export-agent
description: Export an agent.yaml to IDE-native formats (Claude Code plugin, Cursor rules, GitHub Copilot instructions). Use when the user wants to sync their agent definition to their IDE.
---

# Export Agent Definition

Export an `agent.yaml` to IDE-native configuration files.

## Targets

| Target | Output Files |
|--------|-------------|
| `claude-code` | `.claude-plugin/plugin.json`, `skills/<name>/SKILL.md`, `.mcp.json` |
| `cursor` | `.cursor/rules/<name>.mdc` |
| `copilot` | `.github/copilot-instructions.md`, `.github/instructions/<name>.instructions.md` |

## Steps

1. Find `agent.yaml` in the current directory

2. Ask which target(s) to export to, or export to all:
   - Claude Code (plugin structure)
   - Cursor (rule files)
   - GitHub Copilot (instruction files)

3. If `automagent` CLI is installed:
   ```bash
   # Single target
   automagent export --target claude-code --force

   # All targets
   automagent sync --force
   ```

4. If not installed, generate the files directly by reading agent.yaml and mapping:
   - `instructions` → skill/rule body content
   - `mcp` servers → `.mcp.json` (Claude Code only)
   - `context` file globs → Cursor globs / Copilot applyTo
   - `guardrails.behavioral` → rules section in body
   - `metadata` → plugin.json fields

5. Report which files were generated.
