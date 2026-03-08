# LangChain Importer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a LangChain importer to the CLI, completing the Phase 1 PRD's three-importer requirement.

**Architecture:** New `importers/langchain.ts` module following the same pure-function pattern as `crewai.ts` and `openai.ts`. Wire it into the existing `import.ts` command via format detection and switch case. TDD with unit tests first, then schema contract tests.

**Tech Stack:** TypeScript, vitest, existing CLI utilities (slugify, constants)

---

### Task 1: Write failing unit tests for LangChain importer

**Files:**
- Modify: `packages/cli/src/commands/__tests__/commands.test.ts`

**Step 1: Add LangChain importer tests to commands.test.ts**

Add the following test suite after the existing `describe('OpenAI importer', ...)` block (after line 244) and add the import at the top of the file (after line 9):

Import to add at line 10:
```typescript
import { importLangChain } from '../../importers/langchain.js';
```

Test suite to add after line 247 (`type OpenAIInput = ...`):
```typescript
// Type alias to allow extra fields via the index signature
type LangChainInput = Parameters<typeof importLangChain>[0];

describe('LangChain importer', () => {
  it('uses name field when present', () => {
    const result = importLangChain({
      name: 'Research Bot',
      agent_type: 'react',
      llm: 'gpt-4',
      system_message: 'Help with research.',
    });
    expect(result['name']).toBe('research-bot');
  });

  it('falls back to metadata.name when name is absent', () => {
    const result = importLangChain({
      agent_type: 'react',
      llm: 'gpt-4',
      system_message: 'Help.',
      metadata: { name: 'Meta Agent' },
    } as LangChainInput);
    expect(result['name']).toBe('meta-agent');
  });

  it('falls back to agent_type when no name or metadata.name', () => {
    const result = importLangChain({
      agent_type: 'structured-chat',
      llm: 'gpt-4',
      system_message: 'Help.',
    });
    expect(result['name']).toBe('structured-chat');
  });

  it('falls back to imported-agent when no identifiers', () => {
    const result = importLangChain({ llm: 'gpt-4', system_message: 'Help.' });
    expect(result['name']).toBe('imported-agent');
  });

  it('maps system_message to instructions', () => {
    const result = importLangChain({ llm: 'gpt-4', system_message: 'Be helpful.' });
    expect(result['instructions']).toBe('Be helpful.');
  });

  it('prefers prompt over system_message', () => {
    const result = importLangChain({
      llm: 'gpt-4',
      prompt: 'From prompt.',
      system_message: 'From system.',
    });
    expect(result['instructions']).toBe('From prompt.');
  });

  it('maps llm string directly to model', () => {
    const result = importLangChain({ llm: 'gpt-4-turbo', system_message: 'x' });
    expect(result['model']).toBe('gpt-4-turbo');
  });

  it('extracts model from llm object with model_name', () => {
    const result = importLangChain({
      llm: { model_name: 'gpt-4', temperature: 0.7 },
      system_message: 'x',
    });
    expect(result['model']).toEqual({
      id: 'gpt-4',
      settings: { temperature: 0.7 },
    });
  });

  it('extracts model from llm object preferring model over model_name', () => {
    const result = importLangChain({
      llm: { model: 'gpt-4o', model_name: 'gpt-4' },
      system_message: 'x',
    });
    expect(result['model']).toEqual({ id: 'gpt-4o' });
  });

  it('uses top-level model field when no llm', () => {
    const result = importLangChain({ model: 'claude-sonnet-4-20250514', system_message: 'x' } as LangChainInput);
    expect(result['model']).toBe('claude-sonnet-4-20250514');
  });

  it('defaults model to gpt-4 when neither llm nor model present', () => {
    const result = importLangChain({ system_message: 'x' });
    expect(result['model']).toBe('gpt-4');
  });

  it('converts string tools to objects with name', () => {
    const result = importLangChain({
      llm: 'gpt-4', system_message: 'x',
      tools: ['web_search', 'calculator'],
    });
    expect(result['tools']).toEqual([{ name: 'web_search' }, { name: 'calculator' }]);
  });

  it('converts object tools mapping args_schema to inputSchema', () => {
    const result = importLangChain({
      llm: 'gpt-4', system_message: 'x',
      tools: [{
        name: 'search',
        description: 'Web search',
        args_schema: { type: 'object', properties: { q: { type: 'string' } } },
      }],
    });
    const tools = result['tools'] as Array<Record<string, unknown>>;
    expect(tools).toHaveLength(1);
    expect(tools[0]['name']).toBe('search');
    expect(tools[0]['description']).toBe('Web search');
    expect(tools[0]['inputSchema']).toEqual({ type: 'object', properties: { q: { type: 'string' } } });
  });

  it('maps tags to metadata.tags', () => {
    const result = importLangChain({
      llm: 'gpt-4', system_message: 'x',
      tags: ['research', 'analysis'],
    });
    const meta = result['metadata'] as Record<string, unknown>;
    expect(meta['tags']).toEqual(['research', 'analysis']);
  });

  it('puts unmapped fields into extensions.langchain', () => {
    const result = importLangChain({
      llm: 'gpt-4', system_message: 'x',
      agent_type: 'react',
      memory: { type: 'buffer' },
      verbose: true,
    });
    const ext = result['extensions'] as Record<string, unknown>;
    const lc = ext['langchain'] as Record<string, unknown>;
    expect(lc['agent_type']).toBe('react');
    expect(lc['memory']).toEqual({ type: 'buffer' });
    expect(lc['verbose']).toBe(true);
  });

  it('does not create extensions when no unmapped fields', () => {
    const result = importLangChain({ llm: 'gpt-4', system_message: 'x' });
    expect(result['extensions']).toBeUndefined();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/dan/projects/automagent/automagent && npx vitest run packages/cli/src/commands/__tests__/commands.test.ts 2>&1 | head -30`
Expected: FAIL — cannot resolve `../../importers/langchain.js`

**Step 3: Commit**

```bash
git add packages/cli/src/commands/__tests__/commands.test.ts
git commit -m "test: add failing unit tests for LangChain importer"
```

---

### Task 2: Implement the LangChain importer module

**Files:**
- Create: `packages/cli/src/importers/langchain.ts`

**Step 1: Create the importer**

```typescript
import { slugify } from '../utils/slugify.js';
import { DEFAULT_IMPORT_MODEL } from '../utils/constants.js';

export interface LangChainAgentConfig {
  name?: string;
  agent_type?: string;
  llm?: string | {
    model_name?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    [key: string]: unknown;
  };
  model?: string;
  prompt?: string;
  system_message?: string;
  tools?: Array<string | {
    name: string;
    description?: string;
    args_schema?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  tags?: string[];
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

function resolveName(data: LangChainAgentConfig): string {
  if (data.name) return slugify(data.name);
  const metaName = data.metadata?.['name'];
  if (typeof metaName === 'string') return slugify(metaName);
  if (data.agent_type) return slugify(data.agent_type);
  return 'imported-agent';
}

function resolveModel(data: LangChainAgentConfig): string | Record<string, unknown> {
  if (!data.llm) {
    return data.model ?? DEFAULT_IMPORT_MODEL;
  }

  if (typeof data.llm === 'string') {
    return data.llm;
  }

  const id = data.llm.model ?? data.llm.model_name;
  if (!id) return DEFAULT_IMPORT_MODEL;

  const settings: Record<string, unknown> = {};
  if (data.llm.temperature !== undefined) settings['temperature'] = data.llm.temperature;
  if (data.llm.max_tokens !== undefined) settings['max_tokens'] = data.llm.max_tokens;

  if (Object.keys(settings).length > 0) {
    return { id, settings };
  }
  return { id };
}

export function importLangChain(data: LangChainAgentConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  result['name'] = resolveName(data);
  result['description'] = `Imported from LangChain agent: ${data.name ?? data.agent_type ?? result['name']}`;

  const instructions = data.prompt ?? data.system_message;
  if (instructions) {
    result['instructions'] = instructions;
  }

  result['model'] = resolveModel(data);

  if (data.tools && data.tools.length > 0) {
    result['tools'] = data.tools.map((tool) => {
      if (typeof tool === 'string') {
        return { name: tool };
      }
      const mapped: Record<string, unknown> = { name: tool.name };
      if (tool.description) mapped['description'] = tool.description;
      if (tool.args_schema) mapped['inputSchema'] = tool.args_schema;
      return mapped;
    });
  }

  if (data.tags && data.tags.length > 0) {
    result['metadata'] = { tags: data.tags };
  }

  // Collect unmapped fields into extensions.langchain
  const knownKeys = new Set(['name', 'llm', 'model', 'prompt', 'system_message', 'tools', 'tags']);
  const unmapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.has(key)) {
      unmapped[key] = value;
    }
  }

  if (Object.keys(unmapped).length > 0) {
    result['extensions'] = { langchain: unmapped };
  }

  return result;
}
```

**Step 2: Run the unit tests**

Run: `cd /Users/dan/projects/automagent/automagent && npx vitest run packages/cli/src/commands/__tests__/commands.test.ts -t "LangChain importer"`
Expected: All 17 LangChain tests PASS

**Step 3: Commit**

```bash
git add packages/cli/src/importers/langchain.ts
git commit -m "feat: add LangChain importer module"
```

---

### Task 3: Wire LangChain into the import command

**Files:**
- Modify: `packages/cli/src/commands/import.ts`

**Step 1: Edit import.ts**

Three changes needed:

1. Add import at line 9 (after the openai import):
```typescript
import { importLangChain } from '../importers/langchain.js';
```

2. Change the `SupportedFormat` type at line 12:
```typescript
type SupportedFormat = 'crewai' | 'openai' | 'langchain';
```

3. Add LangChain detection in `detectFormat` function, after the OpenAI check (after line 29) and before `return null`:
```typescript
  // LangChain: JSON with prompt/system_message and/or agent_type/llm-object
  if (ext === '.json') {
    const hasPrompt = 'prompt' in data || 'system_message' in data;
    const hasLangChainLlm = 'agent_type' in data || (typeof data['llm'] === 'object' && data['llm'] !== null);
    if (hasPrompt || hasLangChainLlm) {
      return 'langchain';
    }
  }
```

4. Add case in the switch statement (after the openai case around line 183):
```typescript
        case 'langchain':
          agentData = importLangChain(data as Parameters<typeof importLangChain>[0]);
          break;
```

5. Update the format validation array and error messages — change the `valid` array at line 152:
```typescript
        const valid: SupportedFormat[] = ['crewai', 'openai', 'langchain'];
```

6. Update the error hint at line 165-167 to include langchain:
```typescript
          info('Supported formats:');
          info('  crewai      - YAML with role + goal + backstory');
          info('  openai      - JSON with instructions + model');
          info('  langchain   - JSON with prompt/system_message + llm/agent_type');
          info('Use --format <format> to specify explicitly');
```

**Step 2: Build and run full test suite**

Run: `cd /Users/dan/projects/automagent/automagent && npm run build -w packages/cli && npx vitest run packages/cli/src/commands/__tests__/commands.test.ts`
Expected: All existing + new tests PASS

**Step 3: Commit**

```bash
git add packages/cli/src/commands/import.ts
git commit -m "feat: wire LangChain importer into import command"
```

---

### Task 4: Add schema contract tests for LangChain importer

**Files:**
- Modify: `packages/cli/src/commands/__tests__/schema-contract.test.ts`

**Step 1: Add LangChain import and contract tests**

Add import at line 6 (after the openai import):
```typescript
import { importLangChain } from '../../importers/langchain.js';
```

Add a new describe block inside the `importer output — schema contract` describe, after the OpenAI section (after line 83):

```typescript
  describe('LangChain importer', () => {
    it('minimal LangChain import produces valid output', () => {
      expect(validate(importLangChain({ llm: 'gpt-4', system_message: 'Help.' })).valid).toBe(true);
    });

    it('LangChain import with llm object produces valid output', () => {
      const result = importLangChain({
        llm: { model_name: 'gpt-4', temperature: 0.7 },
        system_message: 'Be helpful.',
      });
      expect(validate(result).valid).toBe(true);
    });

    it('LangChain import with tools produces valid output', () => {
      const result = importLangChain({
        llm: 'gpt-4', system_message: 'Help.',
        tools: ['web_search', { name: 'calc', description: 'Calculator', args_schema: { type: 'object' } }],
      });
      expect(validate(result).valid).toBe(true);
    });

    it('LangChain import with tags produces valid output', () => {
      const result = importLangChain({
        llm: 'gpt-4', system_message: 'Help.',
        tags: ['research'],
      });
      expect(validate(result).valid).toBe(true);
    });

    it('LangChain import with extensions produces valid output', () => {
      const result = importLangChain({
        llm: 'gpt-4', system_message: 'Help.',
        agent_type: 'react', memory: { type: 'buffer' }, verbose: true,
      });
      expect(validate(result).valid).toBe(true);
    });
  });
```

Update the `all importers set required fields` cases array (around line 88) to include LangChain:
```typescript
    const cases = [
      { name: 'CrewAI', fn: () => importCrewAI({ role: 'r', goal: 'g', backstory: 'b' }) },
      { name: 'OpenAI', fn: () => importOpenAI({ name: 'bot' }) },
      { name: 'LangChain', fn: () => importLangChain({ llm: 'gpt-4', system_message: 'Help.' }) },
    ];
```

**Step 2: Run contract tests**

Run: `cd /Users/dan/projects/automagent/automagent && npx vitest run packages/cli/src/commands/__tests__/schema-contract.test.ts`
Expected: All tests PASS (existing + 6 new)

**Step 3: Commit**

```bash
git add packages/cli/src/commands/__tests__/schema-contract.test.ts
git commit -m "test: add schema contract tests for LangChain importer"
```

---

### Task 5: Run full test suite and verify build

**Files:** None (verification only)

**Step 1: Build all packages**

Run: `cd /Users/dan/projects/automagent/automagent && npm run build`
Expected: All 4 packages build successfully

**Step 2: Run all tests**

Run: `cd /Users/dan/projects/automagent/automagent && npm run test`
Expected: All tests pass across all packages

**Step 3: Verify CLI import works end-to-end**

Create a test file and import it:
```bash
cd /tmp && cat > langchain-agent.json << 'EOF'
{
  "name": "research-assistant",
  "agent_type": "react",
  "llm": { "model_name": "gpt-4", "temperature": 0.7 },
  "system_message": "You are a research assistant.",
  "tools": [{ "name": "search", "description": "Web search" }],
  "tags": ["research"]
}
EOF
node /Users/dan/projects/automagent/automagent/packages/cli/dist/index.js import langchain-agent.json --force
cat agent.yaml
```
Expected: Valid agent.yaml with name, description, model object, instructions, tools, metadata.tags

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete LangChain importer — closes Phase 1 import gap"
```
