# Roadmap

## Current: 0.x (Pre-1.0)

### Completed
- Schema v1 with progressive disclosure (only name + description required)
- CLI with validate, init, run, import, export, sync commands
- Hub with push, pull, search, diff, versions, unpublish
- GitHub OAuth authentication with PKCE
- Framework importers (CrewAI, OpenAI, LangChain, Claude Code, Cursor, Copilot)
- IDE exporters (Claude Code, Cursor, Copilot)

### In Progress
- Runtime streaming support
- Real MCP server execution in `run` command
- Hub web UI improvements

### Planned
- Agent composition (`agent-compose.yaml`)
- Prompt caching support
- Vision/multimodal agent support
- Extended thinking / reasoning mode
- Hub organizations and teams
- Agent analytics and usage tracking

## 1.0.0 Criteria (per VERSIONING.md)
- 2 consecutive minor releases without breaking changes
- Real-world feedback from early adopters
- Comprehensive test coverage
- All critical and important review issues resolved
- Tooling ecosystem signals (IDE extensions, CI plugins)
