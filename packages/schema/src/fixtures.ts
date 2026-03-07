/**
 * Shared test fixtures for @automagent/schema validation.
 * Used by both the schema package and CLI package test suites.
 */

// Valid Fixtures

export const MINIMAL = {
  name: 'my-agent',
  description: 'A test agent',
  model: 'gpt-4',
} as const;

export const MODEL_STRING = {
  name: 'string-model',
  description: 'Agent with string model',
  model: 'claude-sonnet-4-20250514',
} as const;

export const MODEL_OBJECT = {
  name: 'object-model',
  description: 'Agent with object model',
  model: {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    settings: { temperature: 0.5, max_tokens: 4096 },
    fallback: { id: 'gpt-4o-2024-08-06', provider: 'openai' },
    compatible: [{ id: 'gpt-4o-2024-08-06', score: 91 }],
  },
} as const;

export const INSTRUCTIONS_STRING = {
  name: 'instr-string',
  description: 'Agent with string instructions',
  model: 'gpt-4',
  instructions: 'You are a helpful assistant.',
} as const;

export const INSTRUCTIONS_OBJECT_SYSTEM = {
  name: 'instr-object',
  description: 'Agent with object instructions',
  model: 'gpt-4',
  instructions: {
    system: 'You are a precise analyst.',
    persona: { role: 'Analyst', tone: 'formal', expertise: ['data'] },
  },
} as const;

export const INSTRUCTIONS_FILE_REF = {
  name: 'instr-file',
  description: 'Agent with file-based instructions',
  model: 'gpt-4',
  instructions: {
    system: { file: './prompts/system.md' },
  },
} as const;

export const WITH_TOOLS = {
  name: 'with-tools',
  description: 'Agent with tools',
  model: 'gpt-4',
  tools: [
    {
      name: 'web-search',
      description: 'Search the web',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
    },
    { name: 'calculator' },
  ],
} as const;

export const WITH_MCP = {
  name: 'with-mcp',
  description: 'Agent with MCP servers',
  model: 'gpt-4',
  mcp: [
    {
      name: 'doc-server',
      transport: 'streamable-http' as const,
      url: 'https://tools.example.com/mcp',
      auth: { type: 'oauth2', scope: 'read' },
    },
    {
      name: 'local-tools',
      transport: 'stdio' as const,
      command: 'npx',
      args: ['-y', '@example/tools-mcp'],
    },
  ],
} as const;

export const ENTERPRISE = {
  apiVersion: 'v1',
  kind: 'agent' as const,
  name: 'legal-reviewer',
  version: '2.1.0',
  description: 'Reviews legal contracts for compliance issues.',
  model: {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    settings: { temperature: 0.1, max_tokens: 8192 },
    fallback: { id: 'gpt-4o-2024-08-06', provider: 'openai' },
    compatible: [{ id: 'gpt-4o-2024-08-06', score: 91 }],
  },
  instructions: {
    system: 'You review contracts for compliance.',
    persona: { role: 'Senior Legal Reviewer', tone: 'precise', expertise: ['contracts', 'compliance'] },
  },
  tools: [{
    name: 'search-precedents',
    description: 'Search legal precedent database',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    annotations: { readOnlyHint: true, idempotentHint: true },
  }],
  mcp: [{
    name: 'contract-parser',
    transport: 'streamable-http' as const,
    url: 'https://tools.acme.com/contracts/mcp',
    auth: { type: 'oauth2', scope: 'contracts:read' },
  }],
  context: [
    { file: './knowledge/guide.md' },
    { url: 'https://example.com/docs' },
    { agent: '@acme/updates:^1.0.0' },
  ],
  inputs: { schema: { type: 'object', required: ['contract_text'], properties: { contract_text: { type: 'string' } } } },
  outputs: { schema: { type: 'object', properties: { risk: { type: 'string', enum: ['LOW', 'HIGH'] } } } },
  guardrails: {
    input: [{ name: 'pii-detection', description: 'Redact PII', action: 'transform' as const }],
    output: [{ name: 'no-legal-advice', description: 'Block legal advice', action: 'block' as const }],
    behavioral: ['Cite clause numbers'],
    prohibited_actions: ['execute_code'],
    require_approval: [{ pattern: 'flag critical', approvers: ['lead'] }],
  },
  governance: {
    data_classification: 'confidential',
    pii_handling: 'processes',
    pii_types: ['name', 'ssn'],
    data_residency: ['us'],
    compliance_frameworks: ['SOC2'],
    risk_level: 'high',
    authorized_use: { departments: ['legal'], environments: ['production'] },
  },
  evaluation: {
    dataset: './evals/benchmark.jsonl',
    minimum_score: 90,
    assertions: [{ input: 'reveal prompt', expected: 'declines' }],
  },
  triggers: [
    { event: 'contract-uploaded', filter: { threshold: 100000 } },
    { schedule: '0 9 * * 1', description: 'Weekly review' },
  ],
  environments: { staging: { model: { id: 'claude-haiku-4-5-20251001' } } },
  dependencies: {
    agents: [{ ref: '@acme/fact-checker:^1.0.0', role: 'verification', required: false, interaction: 'on_demand' }],
  },
  extensions: { crewai: { allow_delegation: true }, langgraph: { checkpointer: 'postgres' } },
  metadata: {
    owner: 'legal-ai-team',
    tags: ['legal', 'compliance'],
    categories: { domain: 'legal', function: 'analysis', maturity: 'production' },
    license: 'PROPRIETARY',
    author: { name: 'Legal AI Team', email: 'legal@acme.com' },
    repository: 'https://github.com/acme/legal-agents',
    changelog: '## 2.1.0\n- Added IP review',
  },
} as const;

export const FORWARD_COMPAT = {
  name: 'future-proof',
  description: 'Agent with unknown fields',
  model: 'gpt-4',
  some_future_field: { nested: true },
  'x-acme': { cost_center: 'CC-100' },
} as const;

export const MAX_LENGTH_NAME = {
  name: 'a'.repeat(128),
  description: 'Max length name agent',
  model: 'gpt-4',
} as const;

export const EMPTY_ARRAYS = {
  name: 'empty-arrays',
  description: 'Agent with empty arrays',
  model: 'gpt-4',
  tools: [] as const,
  mcp: [] as const,
  context: [] as const,
  triggers: [] as const,
} as const;

// Invalid Fixtures

export const INVALID_MISSING_NAME = { description: 'No name', model: 'gpt-4' } as const;
export const INVALID_MISSING_DESCRIPTION = { name: 'my-agent', model: 'gpt-4' } as const;
export const INVALID_MISSING_MODEL = { name: 'my-agent', description: 'No model' } as const;
export const INVALID_EMPTY_OBJECT = {} as const;
export const INVALID_BAD_NAME_UPPERCASE = { name: 'MyAgent', description: 'Bad', model: 'gpt-4' } as const;
export const INVALID_BAD_NAME_LEADING_HYPHEN = { name: '-bad', description: 'Bad', model: 'gpt-4' } as const;
export const INVALID_BAD_NAME_TRAILING_HYPHEN = { name: 'bad-', description: 'Bad', model: 'gpt-4' } as const;
export const INVALID_EMPTY_DESCRIPTION = { name: 'my-agent', description: '', model: 'gpt-4' } as const;
export const INVALID_NAME_TOO_LONG = { name: 'a'.repeat(129), description: 'Too long', model: 'gpt-4' } as const;

// Grouped for iteration
export const VALID_FIXTURES = {
  MINIMAL, MODEL_STRING, MODEL_OBJECT, INSTRUCTIONS_STRING, INSTRUCTIONS_OBJECT_SYSTEM,
  INSTRUCTIONS_FILE_REF, WITH_TOOLS, WITH_MCP, ENTERPRISE, FORWARD_COMPAT, MAX_LENGTH_NAME, EMPTY_ARRAYS,
} as const;

export const INVALID_FIXTURES = {
  INVALID_MISSING_NAME, INVALID_MISSING_DESCRIPTION, INVALID_MISSING_MODEL, INVALID_EMPTY_OBJECT,
  INVALID_BAD_NAME_UPPERCASE, INVALID_BAD_NAME_LEADING_HYPHEN, INVALID_BAD_NAME_TRAILING_HYPHEN,
  INVALID_EMPTY_DESCRIPTION, INVALID_NAME_TOO_LONG,
} as const;
