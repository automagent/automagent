# Automagent.dev Implementation Plan: Weeks 1-12

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Launch automagent.dev as an open-source agent definition standard with a hosted registry, CLI, and Free/Pro tiers in 12 weeks.

**Architecture:** Open-source schema spec (JSON Schema + docs) published to GitHub. TypeScript CLI distributed via npm. Next.js web app + API backed by PostgreSQL and S3-compatible storage. Auth via OAuth2 (GitHub, Google). Deployed on Vercel (web) + Railway/Fly.io (API).

**Tech Stack:** TypeScript (CLI + API + Web), Next.js 15 (web app), PostgreSQL (metadata), S3 (agent definition storage), JSON Schema (validation), Commander.js (CLI), Drizzle ORM (database), Tailwind CSS (styling).

**Source documents:**
- Schema design: `docs/decisions/schema-design.md`
- Expert panel review: `docs/ideation/expert-panel-review.md`
- Standards research: `docs/research/ai-standards-landscape.md`

---

## Phase 1: Open-Source the Schema Spec (Weeks 1-2)

**Objective:** Publish the agent definition standard as an open-source spec. Get community feedback before building platform code. Target: 500 GitHub stars, 10-15 practitioners providing feedback.

---

### Task 1.1: Initialize the Monorepo

**Files:**
- Create: `package.json` (workspace root)
- Create: `packages/schema/package.json`
- Create: `packages/cli/package.json`
- Create: `apps/web/package.json`
- Create: `apps/api/package.json`
- Create: `.gitignore`
- Create: `turbo.json`

**Steps:**

1. Initialize a Turborepo monorepo with four packages:
   - `packages/schema` — JSON Schema definition + TypeScript types + validator
   - `packages/cli` — The `automagent` CLI tool
   - `apps/web` — Next.js web app (registry UI)
   - `apps/api` — API server (registry backend)

2. Configure workspace with pnpm:
   ```json
   {
     "name": "automagent",
     "private": true,
     "workspaces": ["packages/*", "apps/*"],
     "packageManager": "pnpm@9.15.0"
   }
   ```

3. Add `.gitignore` (node_modules, dist, .env, .turbo, etc.)

4. Commit: `"chore: initialize monorepo structure"`

---

### Task 1.2: Define the JSON Schema (v0.1)

**Files:**
- Create: `packages/schema/src/v1.schema.json`
- Create: `packages/schema/src/compose.schema.json`
- Create: `packages/schema/src/index.ts`
- Create: `packages/schema/tsconfig.json`
- Create: `packages/schema/package.json`

**Steps:**

1. Write the JSON Schema for `agent.yaml` v1 covering Phase 0.1-0.2 fields:
   - Required: `name` (pattern: `^[a-z0-9][a-z0-9-]*$`), `description`, `model` (string | object)
   - Optional core: `apiVersion`, `kind`, `version`, `instructions` (string | object), `tools` (array + `mcp`), `context`, `inputs`, `outputs`, `metadata`
   - Optional governance: `guardrails`, `governance`
   - Optional operations: `triggers`, `environments`, `dependencies`, `extensions`
   - `additionalProperties: true` for forward compatibility and `x-` custom fields

2. Write the JSON Schema for `agent-compose.yaml` (`kind: compose`):
   - Required: `name`, `description`, `agents` (array of refs with roles)
   - Optional: `workflow`, `governance`, `metadata`

3. Export TypeScript types generated from the schema:
   ```typescript
   export type AgentDefinition = {
     name: string;
     description: string;
     model: string | ModelConfig;
     apiVersion?: string;
     kind?: 'agent' | 'team';
     version?: string;
     instructions?: string | InstructionsConfig;
     tools?: ToolDefinition[];
     // ... all optional fields
   };
   ```

4. Write a `validate(yaml: string): ValidationResult` function using Ajv:
   ```typescript
   import Ajv from 'ajv';
   import schema from './v1.schema.json';

   const ajv = new Ajv({ allErrors: true, strict: false });
   const validateFn = ajv.compile(schema);

   export function validate(data: unknown): ValidationResult {
     const valid = validateFn(data);
     return {
       valid,
       errors: validateFn.errors ?? [],
     };
   }
   ```

5. Write tests:
   - Valid: 3-field minimal definition passes
   - Valid: full enterprise definition passes
   - Valid: agent-compose definition passes
   - Invalid: missing `name` fails with clear error
   - Invalid: missing `description` fails
   - Invalid: missing `model` fails
   - Invalid: bad `name` pattern (uppercase, spaces) fails
   - Valid: unknown fields preserved (forward compatibility)
   - Valid: `x-acme` custom fields accepted

6. Commit: `"feat: define agent.yaml JSON Schema v1 with validator"`

---

### Task 1.3: Write the Spec Documentation

**Files:**
- Create: `packages/schema/README.md`
- Create: `packages/schema/docs/spec.md`
- Create: `packages/schema/docs/examples/minimal.yaml`
- Create: `packages/schema/docs/examples/intermediate.yaml`
- Create: `packages/schema/docs/examples/enterprise.yaml`
- Create: `packages/schema/docs/examples/agent-compose.yaml`

**Steps:**

1. Write `README.md` — the landing page for the open-source spec:
   - One-paragraph pitch: "YAML for humans, JSON Schema for machines. One file, any framework, any registry."
   - The 3-line hello world front and center
   - Quick start: install validator, create agent.yaml, validate
   - Link to full spec and examples
   - "Why not just use Git?" answer in one sentence
   - Contributing guidelines
   - License: Apache 2.0

2. Write `spec.md` — the RFC-style full specification:
   - Design principles (from approved design doc)
   - Required fields with types and validation rules
   - Optional fields organized by section (core, governance, operations)
   - Progressive disclosure: minimal → intermediate → enterprise
   - Standards alignment (MCP tools, A2A discovery, JSON Schema)
   - Cross-framework mapping table
   - Schema evolution strategy (apiVersion, forward/backward compatibility)
   - Extension namespace rules

3. Create the four example files directly from the approved design doc:
   - `minimal.yaml` — 3 lines
   - `intermediate.yaml` — team tool with MCP integrations
   - `enterprise.yaml` — full governance + guardrails
   - `agent-compose.yaml` — multi-agent composition

4. Commit: `"docs: write agent definition spec and examples"`

---

### Task 1.4: Publish Schema Package to npm

**Files:**
- Modify: `packages/schema/package.json` (add build/publish config)
- Create: `packages/schema/tsup.config.ts`

**Steps:**

1. Configure build with tsup (bundles TypeScript for npm):
   ```typescript
   export default defineConfig({
     entry: ['src/index.ts'],
     format: ['cjs', 'esm'],
     dts: true,
     clean: true,
   });
   ```

2. Set package name: `@automagent/schema`

3. Publish to npm as public package

4. Verify: `npx @automagent/schema validate ./agent.yaml` works

5. Commit: `"chore: configure schema package for npm publishing"`

---

### Task 1.5: Publish to GitHub + Community Launch

**Steps:**

1. Create GitHub org: `automagent` (or use existing if available)

2. Push monorepo to `github.com/automagent/automagent`

3. Create a separate `github.com/automagent/spec` repo (or use the packages/schema directory) with just the spec for easy discovery/starring

4. Write a launch post (for dev.to, Hacker News, X/Twitter):
   - Title: "We need a standard way to define AI agents — introducing agent.yaml"
   - The problem: every framework defines agents differently, no portability, no governance
   - The solution: a 3-line definition that scales to enterprise
   - Show the hello world → enterprise progression
   - Call to action: star the repo, give feedback on the RFC, try the validator
   - NOT a product launch — this is an open standard launch

5. Share in relevant communities:
   - LangChain Discord
   - CrewAI Discord
   - AI Engineering Slack communities
   - Reddit: r/MachineLearning, r/LocalLLaMA, r/artificial

6. Commit: `"docs: add launch materials"`

---

## Phase 2: Build the CLI (Weeks 3-4)

**Objective:** Ship a CLI that lets developers create, validate, and locally test agents. No login required for local use. Target: developers go from `npm install` to chatting with their agent in under 5 minutes.

---

### Task 2.1: CLI Scaffolding

**Files:**
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/init.ts`
- Create: `packages/cli/src/commands/validate.ts`
- Create: `packages/cli/src/commands/run.ts`
- Create: `packages/cli/src/commands/push.ts`
- Create: `packages/cli/src/commands/pull.ts`
- Create: `packages/cli/src/commands/diff.ts`
- Create: `packages/cli/src/commands/login.ts`
- Create: `packages/cli/src/commands/import.ts`
- Create: `packages/cli/src/utils/config.ts`
- Create: `packages/cli/src/utils/output.ts`
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Test: `packages/cli/tests/`

**Steps:**

1. Set up Commander.js CLI with command structure:
   ```typescript
   #!/usr/bin/env node
   import { Command } from 'commander';
   const program = new Command();

   program
     .name('automagent')
     .description('The agent definition registry')
     .version('0.1.0');

   program.command('init').description('Create agent.yaml');
   program.command('validate').description('Validate agent.yaml');
   program.command('run').description('Test agent locally');
   program.command('push').description('Publish to registry');
   program.command('pull').description('Fetch from registry');
   program.command('diff').description('Compare local vs published');
   program.command('login').description('Authenticate');
   program.command('import').description('Convert from other formats');

   program.parse();
   ```

2. Configure package.json with `"bin": { "automagent": "./dist/index.js" }`

3. Add output utilities (colored terminal output, spinners, tables)

4. Test: CLI runs, `--help` shows all commands, `--version` shows version

5. Commit: `"feat: scaffold automagent CLI with command structure"`

---

### Task 2.2: `automagent init`

**Files:**
- Modify: `packages/cli/src/commands/init.ts`
- Test: `packages/cli/tests/init.test.ts`

**Steps:**

1. Implement interactive mode (default):
   ```
   $ automagent init
   ? Agent name: code-reviewer
   ? Description: Reviews pull requests for common issues
   ? Model: claude-sonnet
   ? Add instructions? (y/N): y
   ? Instructions: You are a code reviewer...

   Created agent.yaml
   ```

2. Implement `--quick` mode (non-interactive, uses defaults/args):
   ```
   $ automagent init --quick --name my-agent
   Created agent.yaml
   ```

3. Generated file includes JSON Schema comment for editor autocomplete:
   ```yaml
   # yaml-language-server: $schema=https://automagent.dev/schema/v1.json
   name: code-reviewer
   description: Reviews pull requests for common issues
   model: claude-sonnet
   ```

4. Show "Next steps" after creation:
   ```
   Next steps:
     1. Edit agent.yaml to customize instructions
     2. automagent validate    # check your definition
     3. automagent run         # test locally
     4. automagent push        # publish to registry
   ```

5. Tests:
   - `--quick` creates valid agent.yaml with 3 required fields
   - Interactive mode creates file with user-provided values
   - Won't overwrite existing agent.yaml without `--force`
   - Created file passes `validate`

6. Commit: `"feat: implement automagent init command"`

---

### Task 2.3: `automagent validate`

**Files:**
- Modify: `packages/cli/src/commands/validate.ts`
- Test: `packages/cli/tests/validate.test.ts`

**Steps:**

1. Implement validation pipeline:
   - Parse YAML (catch syntax errors with line numbers)
   - Run JSON Schema validation via `@automagent/schema`
   - Check model identifier exists (warn if alias like `gpt-4` without version pin)
   - Scan for high-entropy strings that look like API keys (error: use `$ENV_VAR`)
   - Check file references exist on disk (warn if missing)
   - Check MCP server URLs are reachable (warn, not error — offline is fine)

2. Output format:
   ```
   agent.yaml
     ✓ Schema valid
     ✓ Model "claude-sonnet" recognized
     ⚠ No instructions defined — agent will use default behavior
     ⚠ Model "gpt-4" is an alias. Pin to "gpt-4o-2024-08-06" for reproducibility.
     ✗ Field "tools[0].inputSchema" is missing required property "type"

   1 error, 2 warnings
   ```

3. Exit code: 0 if valid (warnings OK), 1 if errors

4. Tests:
   - Valid minimal file returns exit 0
   - Missing required field returns exit 1 with helpful message
   - API key in YAML returns error with remediation
   - Unknown field returns no error (forward compatibility)
   - Malformed YAML returns error with line number

5. Commit: `"feat: implement automagent validate command"`

---

### Task 2.4: `automagent run`

**Files:**
- Modify: `packages/cli/src/commands/run.ts`
- Create: `packages/cli/src/runtime/agent-runner.ts`
- Create: `packages/cli/src/runtime/tool-mocker.ts`
- Test: `packages/cli/tests/run.test.ts`

**Steps:**

1. Implement local agent runner:
   - Parse agent.yaml
   - Initialize chat session using the specified model's API
   - Pass `instructions` as system prompt
   - Mock tool calls by default (no credentials needed)
   - Support `--live` flag to use real tool connections

2. Requires model provider API key in environment:
   - `ANTHROPIC_API_KEY` for Claude models
   - `OPENAI_API_KEY` for OpenAI models
   - Clear error message if missing: "Set ANTHROPIC_API_KEY to test with claude-sonnet"

3. Interactive chat loop:
   ```
   $ automagent run
   Loading agent "code-reviewer" from ./agent.yaml...
   Model: claude-sonnet
   Tools: 2 defined (mocked — run with --live for real connections)

   You: Review this function for security issues
   Agent: I'll analyze the code for security vulnerabilities...

   [Ctrl+C to exit]
   ```

4. Support `--model` flag to override model for testing:
   ```
   $ automagent run --model claude-haiku
   ```

5. Tests:
   - Parses agent.yaml and extracts system prompt
   - Exits gracefully if no API key set
   - `--model` flag overrides model from file
   - Tool calls are mocked by default with placeholder responses

6. Commit: `"feat: implement automagent run for local testing"`

---

### Task 2.5: `automagent import`

**Files:**
- Modify: `packages/cli/src/commands/import.ts`
- Create: `packages/cli/src/importers/crewai.ts`
- Create: `packages/cli/src/importers/openai.ts`
- Create: `packages/cli/src/importers/langchain.ts`
- Test: `packages/cli/tests/import.test.ts`

**Steps:**

1. Implement format detection:
   ```
   $ automagent import ./my-agent-config.yaml
   Detected: CrewAI agent config
   Converted to agent.yaml (5 fields mapped, 1 needs manual review)
   ```

2. Implement importers for each framework:
   - **CrewAI**: Map `role` → `name`, `goal`+`backstory` → `instructions`, `llm` → `model`, `tools` → `tools`
   - **OpenAI Agents SDK**: Map `name`, `instructions`, `model`, `tools`, `handoffs` → `dependencies.agents`
   - **LangChain**: Map `prompt` → `instructions`, `model` → `model`, `tools` → `tools`

3. Flag unmapped fields with `# TODO: Review — imported from CrewAI` comments

4. Tests:
   - CrewAI YAML with role/goal/backstory maps correctly
   - OpenAI agent JSON with tools maps correctly
   - Unknown format gives helpful error
   - Imported file passes `automagent validate`

5. Commit: `"feat: implement automagent import for CrewAI, OpenAI, LangChain"`

---

### Task 2.6: Publish CLI to npm

**Steps:**

1. Configure package: `@automagent/cli` with bin entry `automagent`

2. Also publish as `automagent` (unscoped) for easy install:
   ```
   npm install -g automagent
   ```

3. Add to README: installation, quick start, all commands

4. Test end-to-end: `npm install -g automagent && automagent init --quick && automagent validate`

5. Commit: `"chore: publish CLI to npm"`

---

## Phase 3: Build the Registry + Web UI (Weeks 5-8)

**Objective:** Build the hosted platform where agents are pushed, discovered, and shared. Target: 50 orgs, 500 public definitions.

---

### Task 3.1: Database Schema

**Files:**
- Create: `apps/api/src/db/schema.ts` (Drizzle ORM)
- Create: `apps/api/src/db/migrations/`

**Steps:**

1. Define database tables using Drizzle ORM:

   ```typescript
   // Users and authentication
   users: { id, github_id, email, username, display_name, avatar_url, created_at }

   // Organizations
   orgs: { id, slug, display_name, created_at }
   org_members: { org_id, user_id, role: 'owner'|'admin'|'publisher'|'member'|'viewer' }

   // Agent definitions
   agents: { id, scope_type: 'user'|'org', scope_id, name, visibility: 'public'|'internal'|'private', created_at }
   agent_versions: { id, agent_id, version, digest_sha256, definition_yaml, definition_json, changelog, published_by, published_at }

   // Metadata (registry-computed)
   agent_stats: { agent_id, downloads_total, downloads_30d, stars, updated_at }
   agent_stars: { agent_id, user_id, created_at }

   // API keys
   api_tokens: { id, user_id, name, token_hash, scopes, expires_at, created_at }
   ```

2. Add indexes: `(scope_type, scope_id, name)` unique, `(agent_id, version)` unique

3. Run initial migration

4. Tests:
   - Create user, create agent, publish version — all succeed
   - Duplicate agent name in same scope fails
   - Duplicate version for same agent fails

5. Commit: `"feat: define database schema for registry"`

---

### Task 3.2: Registry API

**Files:**
- Create: `apps/api/src/routes/agents.ts`
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/routes/orgs.ts`
- Create: `apps/api/src/routes/search.ts`
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/services/storage.ts`
- Test: `apps/api/tests/`

**Steps:**

1. Implement API endpoints:

   **Auth:**
   - `POST /auth/github` — OAuth callback, create/return user + token
   - `POST /auth/tokens` — Create API token for CLI
   - `DELETE /auth/tokens/:id` — Revoke token

   **Agents:**
   - `PUT /agents/@:scope/:name` — Create or update agent metadata
   - `PUT /agents/@:scope/:name/versions/:version` — Publish a version (validates schema, computes digest, stores YAML)
   - `GET /agents/@:scope/:name` — Get agent info + latest version
   - `GET /agents/@:scope/:name/versions/:version` — Get specific version
   - `GET /agents/@:scope/:name/versions` — List all versions
   - `DELETE /agents/@:scope/:name/versions/:version` — Yank (soft-delete, not hard delete)

   **Search & Discovery:**
   - `GET /search?q=&tags=&category=&sort=` — Full-text search across public agents
   - `GET /agents?scope=@acme&visibility=` — List agents in a scope

   **Orgs:**
   - `POST /orgs` — Create org
   - `PUT /orgs/:slug/members` — Add/update member
   - `GET /orgs/:slug/members` — List members

2. Implement authorization middleware:
   - Public agents: anyone can read
   - Internal agents: org members can read
   - Private agents: explicitly granted users can read
   - Publishing: requires `publisher` role or higher in scope

3. Storage: S3-compatible for agent definition YAML blobs, PostgreSQL for metadata

4. On publish: validate schema, compute SHA-256 digest, reject if version already exists (immutability)

5. Tests:
   - Publish agent version, pull it back — content matches
   - Publish same version twice — rejected (immutable)
   - Public agent readable without auth
   - Private agent requires auth
   - Org member with `viewer` role can pull but not push
   - Search returns relevant results
   - Version listing returns semver-sorted

6. Commit: `"feat: implement registry API with auth, publish, search"`

---

### Task 3.3: Connect CLI to Registry

**Files:**
- Modify: `packages/cli/src/commands/login.ts`
- Modify: `packages/cli/src/commands/push.ts`
- Modify: `packages/cli/src/commands/pull.ts`
- Modify: `packages/cli/src/commands/diff.ts`
- Create: `packages/cli/src/api/client.ts`
- Test: `packages/cli/tests/push.test.ts`
- Test: `packages/cli/tests/pull.test.ts`

**Steps:**

1. Implement `automagent login`:
   - Opens browser for GitHub OAuth
   - Stores token in `~/.automagent/config.json`
   - `automagent whoami` shows current user

2. Implement `automagent push`:
   ```
   $ automagent push

   Validating... ✓
   Packaging... ✓

   Publishing code-reviewer@1.0.0 to automagent.dev/@danmcp/code-reviewer

     Name:        code-reviewer
     Scope:       @danmcp
     Visibility:  private
     Version:     1.0.0
     Digest:      sha256:a3f8c9...
     Model:       claude-sonnet

   Published! View at: https://automagent.dev/@danmcp/code-reviewer
   ```

3. Implement `automagent pull`:
   ```
   $ automagent pull @acme/legal-reviewer:2.1.0
   Downloaded agent.yaml to ./legal-reviewer/agent.yaml
   ```

4. Implement `automagent diff`:
   - Semantic diff: compare field-by-field, not line-by-line
   - Show: fields changed, tools added/removed, model changed, instructions changed
   ```
   Comparing local vs @danmcp/code-reviewer@1.0.0

     instructions:  changed (12 lines added)
     tools:         +slack:post-message (new)
     model.settings.temperature:  0.7 → 0.2
   ```

5. Auto-infer scope from `automagent login` user or org config

6. Default visibility: `private`. Public requires `--visibility public`

7. Tests:
   - Push succeeds with valid auth + valid agent.yaml
   - Push fails without login (clear error message)
   - Pull downloads correct version
   - Diff shows meaningful semantic changes
   - Push private by default

8. Commit: `"feat: connect CLI to registry (push, pull, diff, login)"`

---

### Task 3.4: Web UI — Browse & Search

**Files:**
- Create: `apps/web/` (Next.js 15 app with App Router)
- Key pages:
  - `app/page.tsx` — Landing/home
  - `app/search/page.tsx` — Search results
  - `app/[scope]/[name]/page.tsx` — Agent detail
  - `app/[scope]/[name]/versions/page.tsx` — Version history
  - `app/[scope]/page.tsx` — Org/user profile

**Steps:**

1. Landing page:
   - Hero: "The standard way to define AI agents" + 3-line hello world code block
   - Search bar (prominent, like Docker Hub)
   - Featured/trending agents
   - "Get started in 60 seconds" CTA → links to CLI install

2. Search page:
   - Full-text search with filters: tags, categories, maturity, framework compatibility
   - Results show: name, description, stars, downloads, model, last updated

3. Agent detail page:
   - README/description
   - agent.yaml rendered with syntax highlighting
   - Version history with changelogs
   - Star button
   - `automagent pull @scope/name` copy-to-clipboard
   - Metadata sidebar: owner, tags, model, visibility, downloads

4. Version detail page:
   - Full agent.yaml for that version
   - Diff against previous version (semantic)
   - Published by, published at, digest

5. Auth integration:
   - GitHub OAuth login/signup
   - User dashboard: my agents, my orgs, API tokens

6. Style with Tailwind CSS. Clean, developer-focused design. No hero illustrations. Think Docker Hub meets npm.

7. Commit: `"feat: build web UI with search, browse, agent detail pages"`

---

### Task 3.5: GitHub Action for CI Publishing

**Files:**
- Create: `packages/github-action/action.yml`
- Create: `packages/github-action/index.ts`

**Steps:**

1. Create a GitHub Action: `automagent/push-action@v1`
   ```yaml
   # .github/workflows/publish-agent.yaml
   on:
     push:
       branches: [main]
       paths: [agent.yaml]
   jobs:
     publish:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: automagent/push-action@v1
           with:
             token: ${{ secrets.AUTOMAGENT_TOKEN }}
   ```

2. Action validates, then pushes agent.yaml to registry on merge to main

3. Publish to GitHub Marketplace

4. Commit: `"feat: create GitHub Action for CI-based agent publishing"`

---

## Phase 4: Design Partners + Dev Advocate (Weeks 3-8, Parallel)

**Objective:** Recruit design partners who co-develop the schema against real use cases. This runs in parallel with CLI and registry development. Target: 5-10 companies, 3 reference customers.

---

### Task 4.1: Create Design Partner Program Materials

**Files:**
- Create: `docs/design-partner-program.md`

**Steps:**

1. Write design partner outreach:
   - What we're building (one paragraph)
   - What we're asking (try the schema, give feedback, 30-min call biweekly)
   - What they get (early access, input on spec, featured on launch, free Pro tier for 1 year)
   - Ideal partner profile: teams building AI agents in production, 5+ agents, using any framework

2. Create a feedback template (GitHub Issues or Typeform):
   - "Describe an agent you're building today"
   - "Try defining it in agent.yaml — what was easy? What was hard?"
   - "What fields are missing?"
   - "What fields are unnecessary?"

3. Target list for outreach:
   - AI consultancies and agencies (they build agents weekly)
   - Mid-market companies with ML/AI teams (10-50 person teams)
   - Framework community leaders (CrewAI, LangChain, AutoGen power users)
   - DevTools companies already in the AI space

4. Commit: `"docs: create design partner program materials"`

---

### Task 4.2: Outreach and Onboarding

**Steps (not code — founder execution):**

1. Post in framework Discords/Slack channels offering early access
2. DM 20-30 people on X/Twitter who publicly build with AI agents
3. Reach out to 10 AI consultancies via LinkedIn/email
4. Attend 2-3 AI meetups or virtual events to demo the schema
5. Onboard each partner: help them define their first agent.yaml, capture friction

---

### Task 4.3: Hire Developer Advocate

**Steps (not code — founder execution):**

1. Job post: Developer Advocate, Automagent
   - First hire. Will shape the community from day one.
   - Responsibilities: write tutorials, give talks, engage on Discord/GitHub, create example agents
   - Must have: built AI agents in production, written technical content, active on social media
   - Nice to have: contributed to open-source, experience with developer tools

2. This person creates:
   - 5 example agents in the registry (code reviewer, deploy assistant, data analyst, writing editor, customer support)
   - Tutorial: "Define your first agent in 60 seconds"
   - Tutorial: "Import your CrewAI agent to automagent"
   - YouTube/blog walkthrough of the schema
   - Weekly "Agent of the Week" spotlight

---

## Phase 5: Launch Free + Pro Tiers (Weeks 9-12)

**Objective:** First revenue. Validate that developers will pay for private registries. Target: $5K MRR.

---

### Task 5.1: Implement Billing

**Files:**
- Create: `apps/api/src/routes/billing.ts`
- Create: `apps/api/src/services/stripe.ts`
- Modify: `apps/api/src/middleware/auth.ts` (add tier checks)
- Create: `apps/web/app/settings/billing/page.tsx`

**Steps:**

1. Integrate Stripe for subscription management:
   - Free tier: unlimited public agents, CLI, search, ratings
   - Pro tier ($29/mo or $290/yr): private agents (unlimited), version history, deployment hooks, 5 team members, model selection hints

2. Enforce tier limits in API middleware:
   - Free users: cannot push private agents (error with upgrade CTA)
   - Free users: max 3 org members
   - Pro users: full private agent support, up to 5 team members

3. Billing settings page:
   - Current plan display
   - Upgrade/downgrade buttons
   - Payment method management
   - Invoice history

4. Tests:
   - Free user can push public agents
   - Free user cannot push private agents (gets helpful upgrade message)
   - Pro user can push private agents
   - Stripe webhook handles subscription lifecycle

5. Commit: `"feat: implement billing with Stripe for Free and Pro tiers"`

---

### Task 5.2: Launch-Ready Polish

**Files:**
- Modify: `apps/web/app/page.tsx` (landing page final)
- Create: `apps/web/app/docs/page.tsx` (documentation hub)
- Create: `apps/web/app/pricing/page.tsx`

**Steps:**

1. Finalize landing page:
   - Clear value proposition headline
   - 3-line hello world code block
   - "Install in 30 seconds" terminal animation
   - Social proof: design partner logos (with permission)
   - Feature grid: schema, CLI, registry, governance
   - Pricing section: Free vs Pro

2. Documentation hub:
   - Getting started guide
   - Schema reference
   - CLI reference
   - API reference
   - Tutorials from dev advocate
   - Framework integration guides

3. Pricing page:
   - Free vs Pro comparison table
   - "Team" and "Enterprise" shown as "Coming Soon" (builds pipeline)
   - FAQ section

4. SEO: title tags, meta descriptions, Open Graph images for all pages

5. Commit: `"feat: finalize landing page, docs hub, pricing page"`

---

### Task 5.3: Public Launch

**Steps (not code — founder + dev advocate execution):**

1. Write launch blog post:
   - "Introducing automagent.dev — the open standard for AI agent definitions"
   - Show the journey: problem → spec → CLI → registry
   - Feature 2-3 design partner stories
   - CTA: install CLI, push your first agent, star the spec repo

2. Submit to:
   - Hacker News (Show HN)
   - Product Hunt
   - dev.to
   - X/Twitter thread
   - LinkedIn post
   - AI-focused newsletters (The Batch, TLDR AI, Ben's Bites)
   - Reddit: r/MachineLearning, r/artificial, r/SaaS

3. Launch day monitoring:
   - Watch for registration spikes
   - Respond to GitHub issues within 1 hour
   - Monitor API performance
   - Fix any critical bugs immediately

4. Post-launch (Week 12):
   - Analyze metrics: signups, agents pushed, Pro conversions
   - Collect user feedback
   - Prioritize Phase 2 backlog based on real usage data

---

## Success Metrics (Week 12 Targets)

| Metric | Target | Why It Matters |
|--------|--------|---------------|
| GitHub stars (spec repo) | 500+ | Community validation |
| Agent definitions pushed | 2,000+ (500 public) | Supply-side health |
| Registered users | 1,000+ | Adoption signal |
| Orgs with 3+ members | 50+ | Team adoption (not just individuals) |
| Weekly active CLI users | 200+ | Usage frequency = habit |
| Pro tier paying customers | 50-100 | Revenue validation |
| MRR | $1,500-5,000 | Business viability signal |
| Design partners | 5-10 active | Real-world schema validation |
| Time to first push | < 5 minutes | Onboarding quality |

---

## What Comes Next (Months 4-6, Phase 2)

Not in scope for this plan, but planned based on expert panel recommendations:

- **Automated benchmarking** — regression testing across model changes
- **Guardrail runtime enforcement** — lightweight SDK/proxy (opt-in)
- **Team tier** ($149-299/mo) — RBAC, audit logs, 25 members
- **Enterprise tier** (custom) — SSO/SCIM, compliance dashboards, self-hosted option
- **Framework translation** — generate CrewAI/LangChain/AutoGen configs from agent.yaml
- **Deployment connectors** — one-click deploy to AWS Bedrock, Azure AI Studio
- **SOC 2 Type II** certification process

---

## Technical Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Consistent across CLI, API, and web. Large ecosystem. |
| Monorepo | Turborepo + pnpm | Shared types between schema/CLI/API/web. Fast builds. |
| CLI framework | Commander.js | Most popular, well-documented, TypeScript support. |
| Web framework | Next.js 15 (App Router) | SSR for SEO, API routes, Vercel deployment. |
| Database | PostgreSQL | Relational data (users, orgs, versions). Proven at scale. |
| ORM | Drizzle | TypeScript-native, great migrations, lightweight. |
| Storage | S3-compatible | Agent YAML blobs. Works with any cloud. |
| Auth | GitHub OAuth | Target audience is developers. GitHub is their identity. |
| Payments | Stripe | Industry standard for SaaS billing. |
| Hosting (web) | Vercel | Native Next.js support, global CDN. |
| Hosting (API) | Railway or Fly.io | Easy PostgreSQL, auto-deploy, reasonable cost. |
| Schema validation | Ajv | Fastest JSON Schema validator. Industry standard. |
| Package format | YAML | Developer familiarity (k8s, GH Actions, docker-compose). |
