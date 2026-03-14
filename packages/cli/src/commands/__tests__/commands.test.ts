import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseYamlFile, parseYamlString } from '../../utils/yaml.js';
import { importCrewAI } from '../../importers/crewai.js';
import { importOpenAI } from '../../importers/openai.js';
import { importLangChain } from '../../importers/langchain.js';
import { mockToolResponse } from '../../runtime/tool-mocker.js';
import { runCli } from './test-helpers.js';

// ---------------------------------------------------------------------------
// 1. YAML parsing
// ---------------------------------------------------------------------------
describe('YAML parsing', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'yaml-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parseYamlString parses valid YAML into an object', () => {
    const result = parseYamlString('name: my-agent\nmodel: gpt-4\n');
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: 'my-agent', model: 'gpt-4' });
  });

  it('parseYamlString returns error with line info for invalid YAML', () => {
    const result = parseYamlString('name: my-agent\n  bad-indent: true\n');
    expect(result.error).not.toBeNull();
    expect(result.line).toBeTypeOf('number');
  });

  it('parseYamlFile returns error for missing file', () => {
    const result = parseYamlFile('/tmp/does-not-exist-abc123.yaml');
    expect(result.error).toMatch(/not found/i);
    expect(result.data).toBeNull();
  });

  it('parseYamlFile reads and parses a valid YAML file', () => {
    const filePath = join(tmpDir, 'agent.yaml');
    writeFileSync(filePath, 'name: test\nmodel: gpt-4\n');
    const result = parseYamlFile(filePath);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: 'test', model: 'gpt-4' });
  });

  it('parseYamlString handles empty string as null data without error', () => {
    const result = parseYamlString('');
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });

  it('parseYamlString parses arrays correctly', () => {
    const result = parseYamlString('- one\n- two\n');
    expect(result.error).toBeNull();
    expect(result.data).toEqual(['one', 'two']);
  });
});

// ---------------------------------------------------------------------------
// 2. Importers
// ---------------------------------------------------------------------------
describe('CrewAI importer', () => {
  it('maps role to slugified name', () => {
    const result = importCrewAI({
      role: 'Senior Data Analyst',
      goal: 'Analyze data',
      backstory: 'Expert analyst',
    });
    expect(result['name']).toBe('senior-data-analyst');
  });

  it('combines goal and backstory into instructions', () => {
    const result = importCrewAI({
      role: 'writer',
      goal: 'Write content',
      backstory: 'Creative writer',
    });
    expect(result['instructions']).toBe('Goal: Write content\n\nBackstory: Creative writer');
  });

  it('maps known model aliases via MODEL_MAP', () => {
    const result = importCrewAI({
      role: 'agent',
      goal: 'g',
      backstory: 'b',
      llm: 'claude-3-sonnet',
    });
    expect(result['model']).toBe('claude-sonnet-4-20250514');
  });

  it('passes through gpt-prefixed models as-is', () => {
    const result = importCrewAI({
      role: 'agent',
      goal: 'g',
      backstory: 'b',
      llm: 'gpt-4-turbo',
    });
    expect(result['model']).toBe('gpt-4-turbo');
  });

  it('defaults model to gpt-4o-2024-08-06 when llm is not specified', () => {
    const result = importCrewAI({ role: 'r', goal: 'g', backstory: 'b' });
    expect(result['model']).toBe('gpt-4o-2024-08-06');
  });

  it('converts string tools to objects with name', () => {
    const result = importCrewAI({
      role: 'r',
      goal: 'g',
      backstory: 'b',
      tools: ['web_search', 'calculator'],
    });
    expect(result['tools']).toEqual([{ name: 'web_search' }, { name: 'calculator' }]);
  });

  it('converts object tools preserving extra fields', () => {
    const result = importCrewAI({
      role: 'r',
      goal: 'g',
      backstory: 'b',
      tools: [{ name: 'my-tool', apiKey: 'xxx' }],
    });
    expect(result['tools']).toEqual([{ name: 'my-tool', apiKey: 'xxx' }]);
  });

  it('puts unmapped fields into extensions.crewai', () => {
    const result = importCrewAI({
      role: 'r',
      goal: 'g',
      backstory: 'b',
      verbose: true,
      allow_delegation: false,
    });
    const ext = result['extensions'] as Record<string, unknown>;
    expect(ext).toBeDefined();
    const crewai = ext['crewai'] as Record<string, unknown>;
    expect(crewai['verbose']).toBe(true);
    expect(crewai['allow_delegation']).toBe(false);
  });

  it('does not create extensions when there are no unmapped fields', () => {
    const result = importCrewAI({ role: 'r', goal: 'g', backstory: 'b' });
    expect(result['extensions']).toBeUndefined();
  });
});

describe('OpenAI importer', () => {
  it('slugifies name', () => {
    const result = importOpenAI({ name: 'My Research Bot' });
    expect(result['name']).toBe('my-research-bot');
  });

  it('maps instructions directly', () => {
    const result = importOpenAI({ name: 'bot', instructions: 'Do stuff' });
    expect(result['instructions']).toBe('Do stuff');
  });

  it('defaults model to gpt-4o-2024-08-06 when not provided', () => {
    const result = importOpenAI({ name: 'bot' });
    expect(result['model']).toBe('gpt-4o-2024-08-06');
  });

  it('converts function tools to automagent tools format', () => {
    const result = importOpenAI({
      name: 'bot',
      tools: [
        {
          type: 'function',
          function: {
            name: 'search',
            description: 'Search the web',
            parameters: { type: 'object', properties: { q: { type: 'string' } } },
          },
        },
      ],
    });
    const tools = result['tools'] as Array<Record<string, unknown>>;
    expect(tools).toHaveLength(1);
    expect(tools[0]['name']).toBe('search');
    expect(tools[0]['description']).toBe('Search the web');
    expect(tools[0]['inputSchema']).toEqual({
      type: 'object',
      properties: { q: { type: 'string' } },
    });
  });

  it('maps handoffs to dependencies.agents', () => {
    const result = importOpenAI({
      name: 'bot',
      handoffs: ['triage-agent', { name: 'specialist' }],
    });
    const deps = result['dependencies'] as Record<string, unknown>;
    expect(deps['agents']).toEqual([
      { ref: 'triage-agent', role: 'handoff' },
      { ref: 'specialist', role: 'handoff' },
    ]);
  });

  it('puts non-function tools into extensions.openai', () => {
    const result = importOpenAI({
      name: 'bot',
      tools: [{ type: 'code_interpreter' }],
    });
    const ext = result['extensions'] as Record<string, unknown>;
    const openai = ext['openai'] as Record<string, unknown>;
    expect(openai['tools']).toEqual([{ type: 'code_interpreter' }]);
  });

  it('puts unknown top-level fields into extensions.openai', () => {
    const result = importOpenAI({
      name: 'bot',
      temperature: 0.7,
    } as OpenAIInput);
    const ext = result['extensions'] as Record<string, unknown>;
    const openai = ext['openai'] as Record<string, unknown>;
    expect(openai['temperature']).toBe(0.7);
  });
});

// Type alias to allow extra fields via the index signature
type OpenAIInput = Parameters<typeof importOpenAI>[0];

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

  it('defaults model to gpt-4o-2024-08-06 when neither llm nor model present', () => {
    const result = importLangChain({ system_message: 'x' });
    expect(result['model']).toBe('gpt-4o-2024-08-06');
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
      memory: { type: 'buffer' },
      verbose: true,
      callbacks: ['my-callback'],
    });
    const ext = result['extensions'] as Record<string, unknown>;
    const lc = ext['langchain'] as Record<string, unknown>;
    expect(lc['memory']).toEqual({ type: 'buffer' });
    expect(lc['verbose']).toBe(true);
    expect(lc['callbacks']).toEqual(['my-callback']);
  });

  it('does not put agent_type or metadata into extensions', () => {
    const result = importLangChain({
      agent_type: 'react',
      llm: 'gpt-4',
      system_message: 'x',
      metadata: { name: 'test' },
    } as LangChainInput);
    expect(result['extensions']).toBeUndefined();
  });

  it('does not create extensions when no unmapped fields', () => {
    const result = importLangChain({ llm: 'gpt-4', system_message: 'x' });
    expect(result['extensions']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Tool mocker
// ---------------------------------------------------------------------------
describe('Tool mocker', () => {
  it('returns JSON with tool name, input, and result message', () => {
    const response = mockToolResponse({ name: 'web_search', input: { query: 'test' } });
    const parsed = JSON.parse(response);
    expect(parsed.tool).toBe('web_search');
    expect(parsed.input).toEqual({ query: 'test' });
    expect(parsed.result).toBe('Mock: this tool would execute in production');
  });

  it('handles tool names with special characters', () => {
    const response = mockToolResponse({ name: 'my-custom_tool.v2', input: {} });
    const parsed = JSON.parse(response);
    expect(parsed.tool).toBe('my-custom_tool.v2');
    expect(parsed.input).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// 4. Validate command (subprocess integration tests)
// ---------------------------------------------------------------------------
describe('validate command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'validate-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 for a valid agent.yaml', () => {
    const yaml = [
      'name: my-agent',
      'description: A helpful assistant',
      'model: claude-sonnet-4-20250514',
      'instructions: You are a helpful assistant.',
    ].join('\n');
    writeFileSync(join(tmpDir, 'agent.yaml'), yaml);

    const { exitCode } = runCli('validate', tmpDir);
    expect(exitCode).toBe(0);
  });

  it('exits 1 for missing required fields', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'description: no name or model\n');

    const { exitCode, stdout } = runCli('validate', tmpDir);
    expect(exitCode).toBe(1);
  });

  it('exits 1 when YAML contains an API key-like string', () => {
    const yaml = [
      'name: my-agent',
      'description: test',
      'model: gpt-4-turbo',
      'instructions: sk-1234567890abcdef1234567890abcdef',
    ].join('\n');
    writeFileSync(join(tmpDir, 'agent.yaml'), yaml);

    const { exitCode, stdout } = runCli('validate', tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/secret/i);
  });

  it('exits 0 but warns for unpinned model alias', () => {
    const yaml = [
      'name: my-agent',
      'description: test agent',
      'model: claude-sonnet',
      'instructions: You are helpful.',
    ].join('\n');
    writeFileSync(join(tmpDir, 'agent.yaml'), yaml);

    const { exitCode, stdout } = runCli('validate', tmpDir);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/unpinned/i);
  });

  it('exits 1 when the YAML file does not exist', () => {
    const { exitCode, stdout } = runCli('validate ./missing.yaml', tmpDir);
    expect(exitCode).toBe(1);
  });

  it('exits 1 for syntactically invalid YAML', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'name: ok\n  broken: indent\n');
    const { exitCode } = runCli('validate', tmpDir);
    expect(exitCode).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Init command (subprocess integration tests)
// ---------------------------------------------------------------------------
describe('init command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'init-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('--quick generates a valid agent.yaml with defaults', () => {
    const { exitCode } = runCli('init --quick', tmpDir);
    expect(exitCode).toBe(0);

    const filePath = join(tmpDir, 'agent.yaml');
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('name: my-agent');
    expect(content).toContain('model:');
    expect(content).toContain('instructions:');
  });

  it('--quick --name sets a custom agent name', () => {
    const { exitCode } = runCli('init --quick --name test-bot', tmpDir);
    expect(exitCode).toBe(0);

    const content = readFileSync(join(tmpDir, 'agent.yaml'), 'utf-8');
    expect(content).toContain('name: test-bot');
  });

  it('--quick --name with invalid name exits 1', () => {
    const { exitCode } = runCli('init --quick --name "INVALID NAME!"', tmpDir);
    expect(exitCode).toBe(1);
  });

  it('refuses to overwrite existing file without --force', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'existing content');
    const { exitCode, stdout } = runCli('init --quick', tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/already exists/i);
  });

  it('--force overwrites existing file', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'old content');
    const { exitCode } = runCli('init --quick --force', tmpDir);
    expect(exitCode).toBe(0);

    const content = readFileSync(join(tmpDir, 'agent.yaml'), 'utf-8');
    expect(content).not.toContain('old content');
    expect(content).toContain('name:');
  });

  it('generated file includes schema directive comment', () => {
    runCli('init --quick', tmpDir);
    const content = readFileSync(join(tmpDir, 'agent.yaml'), 'utf-8');
    expect(content).toMatch(/^# yaml-language-server: \$schema=/);
  });

  it('generated file validates successfully', () => {
    runCli('init --quick', tmpDir);
    const { exitCode } = runCli('validate', tmpDir);
    expect(exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Search command (subprocess integration tests)
// ---------------------------------------------------------------------------
describe('search command', () => {
  it('exits 1 when hub is unreachable', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'search-test-'));
    try {
      const { exitCode } = runCli('search test-query --hub-url http://localhost:9999', tmpDir);
      expect(exitCode).toBe(1);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Pull command (subprocess integration tests)
// ---------------------------------------------------------------------------
describe('pull command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pull-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 1 when hub is unreachable', () => {
    const { exitCode } = runCli('pull @acme/test-agent --hub-url http://localhost:9999', tmpDir);
    expect(exitCode).toBe(1);
  });

  it('refuses to overwrite without --force', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'existing');
    const { exitCode, stdout } = runCli('pull @acme/test-agent --hub-url http://localhost:9999', tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/already exists/i);
  });
});

// ---------------------------------------------------------------------------
// 8. Push command (subprocess integration tests)
// ---------------------------------------------------------------------------
describe('push command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'push-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 1 when agent.yaml does not exist', () => {
    const { exitCode } = runCli('push --hub-url http://localhost:9999', tmpDir);
    expect(exitCode).toBe(1);
  });

  it('exits 1 when agent.yaml is invalid', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'description: no name or model\n');
    const { exitCode } = runCli('push --hub-url http://localhost:9999', tmpDir);
    expect(exitCode).toBe(1);
  });
});
