# README Improvement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all broken links, create missing example files, and rewrite the README to properly showcase the agent.yaml standard.

**Architecture:** Create example YAML files referenced by the spec, fix relative links in docs/spec.md, rewrite README.md with progressive disclosure showcase and working links.

**Tech Stack:** Markdown, YAML

---

### Task 1: Create examples directory and minimal.yaml

**Files:**
- Create: `examples/minimal.yaml`

**Step 1: Create the example file**

```yaml
# The simplest possible agent definition — just 3 fields.
# yaml-language-server: $schema=https://raw.githubusercontent.com/automagent/automagent/main/packages/schema/src/v1.schema.json
name: my-agent
description: Answers questions about our codebase
model: claude-sonnet
```

**Step 2: Validate it**

Run: `node packages/cli/dist/index.js validate examples/minimal.yaml`
Expected: validation passes

**Step 3: Commit**

```bash
git add examples/minimal.yaml
git commit -m "docs: add minimal agent.yaml example"
```

---

### Task 2: Create intermediate.yaml

**Files:**
- Create: `examples/intermediate.yaml`

**Step 1: Create the example file**

Content should demonstrate Tier 2 features from the spec: model as object with settings, tools with inputSchema, MCP server references, context sources, and metadata. ~40-60 lines.

**Step 2: Validate it**

Run: `node packages/cli/dist/index.js validate examples/intermediate.yaml`
Expected: validation passes

**Step 3: Commit**

```bash
git add examples/intermediate.yaml
git commit -m "docs: add intermediate agent.yaml example"
```

---

### Task 3: Create enterprise.yaml

**Files:**
- Create: `examples/enterprise.yaml`

**Step 1: Create the example file**

Content should demonstrate Tier 3 features: structured instructions with persona, inputs/outputs with JSON Schema, guardrails (input, output, behavioral, prohibited_actions), governance (data classification, PII, compliance), evaluation, triggers, environments, and extensions. ~80-120 lines.

**Step 2: Validate it**

Run: `node packages/cli/dist/index.js validate examples/enterprise.yaml`
Expected: validation passes

**Step 3: Commit**

```bash
git add examples/enterprise.yaml
git commit -m "docs: add enterprise agent.yaml example"
```

---

### Task 4: Create agent-compose.yaml

**Files:**
- Create: `examples/agent-compose.yaml`

**Step 1: Create the example file**

Content should demonstrate the compose schema: name, description, kind: compose, agents with ref/role, workflow with sequential steps, governance, metadata. ~30-50 lines.

Note: This file uses compose.schema.json, not v1.schema.json. The CLI validate command may not support compose files — if validation fails, that's acceptable for a docs-only example.

**Step 2: Commit**

```bash
git add examples/agent-compose.yaml
git commit -m "docs: add agent-compose.yaml example"
```

---

### Task 5: Fix links in docs/spec.md

**Files:**
- Modify: `docs/spec.md:4-5` (schema URLs — add note about working alternative)
- Modify: `docs/spec.md:60` (fix example link paths from `examples/` to `../examples/`)
- Modify: `docs/spec.md:65` (fix example link)
- Modify: `docs/spec.md:75` (fix example link)
- Modify: `docs/spec.md:330` (fix example link)

**Step 1: Update relative links**

All `examples/*.yaml` links become `../examples/*.yaml` since spec.md is in `docs/`.

**Step 2: Add schema URL note**

Add a note under the schema URLs explaining they are canonical identifiers. Provide the raw GitHub URL as a working alternative for editor autocomplete.

**Step 3: Commit**

```bash
git add docs/spec.md
git commit -m "docs: fix relative links in spec.md"
```

---

### Task 6: Rewrite README.md

**Files:**
- Modify: `README.md`

**Step 1: Write new README**

Structure:
1. **Header**: name + badges (npm version for both packages, license)
2. **Tagline**: "An open standard for defining AI agents via agent.yaml"
3. **What is agent.yaml**: Show the 3-field minimal example inline with brief explanation
4. **Progressive Disclosure**: Show how it scales — minimal → intermediate → enterprise snippets
5. **Key Features**: Standards alignment (MCP tools, A2A discovery, JSON Schema), framework importers (CrewAI, OpenAI, LangChain), hub (push/pull/search)
6. **Packages**: Table linking to schema and CLI packages
7. **Quick Start**: install, init, validate, run
8. **Editor Support**: yaml-language-server schema directive with working URL
9. **Documentation**: Links to spec, examples dir, versioning — all verified working
10. **Development**: Build/test/lint commands
11. **License**: Apache-2.0

**Step 2: Verify all links resolve**

Manually check every relative link points to an existing file.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with examples and working links"
```

---

### Task 7: Final verification

**Step 1: Verify all example files validate**

Run: `npm run build && node packages/cli/dist/index.js validate examples/minimal.yaml`

**Step 2: Verify no broken relative links remain**

Check all markdown links in README.md and docs/spec.md point to existing files.

**Step 3: Squash or leave commits as-is per user preference**
