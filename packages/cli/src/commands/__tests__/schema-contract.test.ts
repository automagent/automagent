import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validate, fixtures, NAME_PATTERN, NAME_MAX_LENGTH } from '@automagent/schema';
import agentSchema from '@automagent/schema/v1.schema.json' with { type: 'json' };
import { importCrewAI } from '../../importers/crewai.js';
import { importOpenAI } from '../../importers/openai.js';
import { importLangChain } from '../../importers/langchain.js';
import { detectProvider, resolveModelString, resolveInstructions } from '../../commands/run.js';
import type { AgentDefinition } from '@automagent/schema';

// =============================================================================
// 1. Shared fixtures validate through schema (cross-package contract)
// =============================================================================

describe('shared fixtures — schema contract', () => {
  for (const [name, fixture] of Object.entries(fixtures.VALID_FIXTURES)) {
    it(`valid fixture ${name} passes validate()`, () => {
      expect(validate(fixture).valid).toBe(true);
    });
  }

  for (const [name, fixture] of Object.entries(fixtures.INVALID_FIXTURES)) {
    it(`invalid fixture ${name} fails validate()`, () => {
      expect(validate(fixture).valid).toBe(false);
    });
  }
});

// =============================================================================
// 2. Importer output validates against schema
// =============================================================================

describe('importer output — schema contract', () => {
  describe('CrewAI importer', () => {
    it('minimal CrewAI import produces valid output', () => {
      const result = importCrewAI({ role: 'analyst', goal: 'analyze', backstory: 'expert' });
      expect(validate(result).valid).toBe(true);
    });

    it('CrewAI import with tools produces valid output', () => {
      const result = importCrewAI({
        role: 'researcher', goal: 'research topics', backstory: 'senior researcher',
        tools: ['web_search', { name: 'calculator' }],
      });
      expect(validate(result).valid).toBe(true);
    });

    it('CrewAI import with extensions produces valid output', () => {
      const result = importCrewAI({
        role: 'writer', goal: 'write', backstory: 'creative',
        verbose: true, allow_delegation: false,
      });
      expect(validate(result).valid).toBe(true);
    });

    it('CrewAI import with custom model produces valid output', () => {
      const result = importCrewAI({ role: 'agent', goal: 'g', backstory: 'b', llm: 'gpt-4-turbo' });
      expect(validate(result).valid).toBe(true);
    });
  });

  describe('OpenAI importer', () => {
    it('minimal OpenAI import produces valid output', () => {
      expect(validate(importOpenAI({ name: 'My Bot' })).valid).toBe(true);
    });

    it('OpenAI import with function tools produces valid output', () => {
      const result = importOpenAI({
        name: 'search-bot', instructions: 'Search.', model: 'gpt-4-turbo',
        tools: [{
          type: 'function',
          function: { name: 'search', description: 'Web search', parameters: { type: 'object', properties: { q: { type: 'string' } } } },
        }],
      });
      expect(validate(result).valid).toBe(true);
    });

    it('OpenAI import with handoffs produces valid output', () => {
      expect(validate(importOpenAI({ name: 'router', handoffs: ['spec-a', { name: 'spec-b' }] })).valid).toBe(true);
    });

    it('OpenAI import with non-function tools produces valid output', () => {
      expect(validate(importOpenAI({ name: 'coder', tools: [{ type: 'code_interpreter' }] })).valid).toBe(true);
    });
  });

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
        memory: { type: 'buffer' }, verbose: true,
      });
      expect(validate(result).valid).toBe(true);
    });
  });

  describe('all importers set required fields', () => {
    const cases = [
      { name: 'CrewAI', fn: () => importCrewAI({ role: 'r', goal: 'g', backstory: 'b' }) },
      { name: 'OpenAI', fn: () => importOpenAI({ name: 'bot' }) },
      { name: 'LangChain', fn: () => importLangChain({ llm: 'gpt-4', system_message: 'Help.' }) },
    ];
    for (const { name, fn } of cases) {
      it(`${name} output has name, description, and model`, () => {
        const result = fn();
        expect(typeof result['name']).toBe('string');
        expect((result['name'] as string).length).toBeGreaterThan(0);
        expect(typeof result['description']).toBe('string');
        expect((result['description'] as string).length).toBeGreaterThan(0);
        expect(result['model']).toBeDefined();
      });
    }
  });
});

// =============================================================================
// 3. Structural parity — schema JSON matches expectations
// =============================================================================

describe('structural parity', () => {
  it('schema requires exactly name and description', () => {
    expect(agentSchema.required).toEqual(['name', 'description']);
  });

  it('schema name pattern matches exported NAME_PATTERN', () => {
    const schemaPattern = (agentSchema.properties.name as { pattern: string }).pattern;
    expect(schemaPattern).toBe(NAME_PATTERN.source);
  });

  it('schema name maxLength matches exported NAME_MAX_LENGTH', () => {
    const schemaMax = (agentSchema.properties.name as { maxLength: number }).maxLength;
    expect(schemaMax).toBe(NAME_MAX_LENGTH);
  });

  it('schema kind enum is agent and team', () => {
    const kindEnum = (agentSchema.properties.kind as { enum: string[] }).enum;
    expect(kindEnum).toEqual(['agent', 'team']);
  });

  it('schema transport enum is stdio and streamable-http', () => {
    const def = (agentSchema.definitions as Record<string, { properties: Record<string, { enum?: string[] }> }>)['McpServerConfig'];
    expect(def.properties.transport.enum).toEqual(['stdio', 'streamable-http']);
  });

  it('schema guardrail action enum is block, warn, transform, log', () => {
    const def = (agentSchema.definitions as Record<string, { properties: Record<string, { enum?: string[] }> }>)['GuardrailRule'];
    expect(def.properties.action.enum).toEqual(['block', 'warn', 'transform', 'log']);
  });

  it('ToolDefinition requires name', () => {
    const def = (agentSchema.definitions as Record<string, { required?: string[] }>)['ToolDefinition'];
    expect(def.required).toContain('name');
  });

  it('McpServerConfig requires name and transport', () => {
    const def = (agentSchema.definitions as Record<string, { required?: string[] }>)['McpServerConfig'];
    expect(def.required).toEqual(expect.arrayContaining(['name', 'transport']));
  });

  it('AgentDependency requires ref', () => {
    const def = (agentSchema.definitions as Record<string, { required?: string[] }>)['AgentDependency'];
    expect(def.required).toContain('ref');
  });

  it('ModelConfig requires id', () => {
    const def = (agentSchema.definitions as Record<string, { required?: string[] }>)['ModelConfig'];
    expect(def.required).toContain('id');
  });
});

// =============================================================================
// 4. Edge cases and boundary tests
// =============================================================================

describe('schema edge cases', () => {
  it('name at max length (128) validates', () => {
    expect(validate(fixtures.MAX_LENGTH_NAME).valid).toBe(true);
  });

  it('name over max length (129) is rejected', () => {
    expect(validate(fixtures.INVALID_NAME_TOO_LONG).valid).toBe(false);
  });

  it('single-char name validates', () => {
    expect(validate({ name: 'a', description: 'd', model: 'm' }).valid).toBe(true);
  });

  it('empty tools array validates', () => {
    expect(validate({ ...fixtures.MINIMAL, tools: [] }).valid).toBe(true);
  });

  it('tool with only name validates', () => {
    expect(validate({ ...fixtures.MINIMAL, tools: [{ name: 'x' }] }).valid).toBe(true);
  });

  it('model as number is rejected', () => {
    expect(validate({ name: 'a', description: 'd', model: 42 }).valid).toBe(false);
  });

  it('model as boolean is rejected', () => {
    expect(validate({ name: 'a', description: 'd', model: true }).valid).toBe(false);
  });

  it('model as array is rejected', () => {
    expect(validate({ name: 'a', description: 'd', model: ['gpt-4'] }).valid).toBe(false);
  });

  it('model object missing id is rejected', () => {
    expect(validate({ name: 'a', description: 'd', model: { provider: 'anthropic' } }).valid).toBe(false);
  });

  it('mcp server missing transport is rejected', () => {
    expect(validate({ ...fixtures.MINIMAL, mcp: [{ name: 'x' }] }).valid).toBe(false);
  });

  it('mcp transport with invalid enum is rejected', () => {
    expect(validate({ ...fixtures.MINIMAL, mcp: [{ name: 'x', transport: 'grpc' }] }).valid).toBe(false);
  });

  it('guardrail action with invalid enum is rejected', () => {
    expect(validate({ ...fixtures.MINIMAL, guardrails: { input: [{ action: 'delete' }] } }).valid).toBe(false);
  });

  it('dependency agent missing ref is rejected', () => {
    expect(validate({ ...fixtures.MINIMAL, dependencies: { agents: [{ role: 'helper' }] } }).valid).toBe(false);
  });

  it('unknown top-level fields are allowed', () => {
    expect(validate(fixtures.FORWARD_COMPAT).valid).toBe(true);
  });
});

// =============================================================================
// 5. Round-trip — CLI functions handle all schema-valid shapes
// =============================================================================

describe('CLI handles all model shapes', () => {
  it('resolveModelString with string model', () => {
    expect(resolveModelString('gpt-4')).toBe('gpt-4');
  });

  it('resolveModelString with object model', () => {
    expect(resolveModelString({ id: 'claude-sonnet-4-20250514', provider: 'anthropic' })).toBe('claude-sonnet-4-20250514');
  });

  it('detectProvider with string claude model', () => {
    const info = detectProvider('claude-sonnet-4-20250514');
    expect(info.provider).toBe('anthropic');
    expect(info.envVar).toBe('ANTHROPIC_API_KEY');
  });

  it('detectProvider with string gpt model', () => {
    const info = detectProvider('gpt-4o');
    expect(info.provider).toBe('openai');
    expect(info.envVar).toBe('OPENAI_API_KEY');
  });

  it('detectProvider with object model with explicit provider', () => {
    expect(detectProvider({ id: 'custom', provider: 'anthropic' }).provider).toBe('anthropic');
  });

  it('detectProvider with object model without provider falls back to id', () => {
    expect(detectProvider({ id: 'claude-sonnet-4-20250514' }).provider).toBe('anthropic');
  });

  it('detectProvider defaults to anthropic for unknown model', () => {
    expect(detectProvider('some-unknown-model').provider).toBe('anthropic');
  });
});

describe('CLI handles all instruction shapes', () => {
  const base = { name: 'test', description: 'Test agent', model: 'gpt-4' };

  it('no instructions — falls back to name + description', () => {
    expect(resolveInstructions(base as AgentDefinition)).toBe('You are test. Test agent');
  });

  it('string instructions — returns the string', () => {
    expect(resolveInstructions({ ...base, instructions: 'Be helpful.' } as AgentDefinition)).toBe('Be helpful.');
  });

  it('object with system string — returns system', () => {
    expect(resolveInstructions({ ...base, instructions: { system: 'System prompt.' } } as AgentDefinition)).toBe('System prompt.');
  });

  it('object with system file ref — reads file content', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'instr-test-'));
    try {
      writeFileSync(join(tmpDir, 'prompt.md'), 'You are an expert analyst.');
      const def = { ...base, instructions: { system: { file: './prompt.md' } } } as AgentDefinition;
      expect(resolveInstructions(def, tmpDir)).toBe('You are an expert analyst.');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('object with system file ref — throws if file missing', () => {
    const def = { ...base, instructions: { system: { file: './nonexistent.md' } } } as AgentDefinition;
    expect(() => resolveInstructions(def, '/tmp')).toThrow(/not found/i);
  });

  it('object with only persona — constructs prompt from persona fields', () => {
    expect(resolveInstructions({ ...base, instructions: { persona: { role: 'Analyst' } } } as AgentDefinition)).toBe('You are a Analyst.');
  });
});
