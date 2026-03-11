import { describe, it, expect } from 'vitest';
import { exportClaudeCode } from '../claude-code.js';

describe('exportClaudeCode', () => {
  it('generates plugin.json from agent definition', () => {
    const result = exportClaudeCode({
      name: 'code-reviewer',
      description: 'Reviews code for quality',
      version: '0.2.0',
    });

    expect(result['plugin.json']).toEqual({
      name: 'code-reviewer',
      version: '0.2.0',
      description: 'Reviews code for quality',
    });
  });

  it('generates SKILL.md from instructions string', () => {
    const result = exportClaudeCode({
      name: 'my-agent',
      description: 'A helpful agent',
      instructions: 'You are a code reviewer. Focus on correctness.',
    });

    const skill = result['skills/my-agent/SKILL.md'] as string;
    expect(skill).toContain('---');
    expect(skill).toContain('name: my-agent');
    expect(skill).toContain('description: A helpful agent');
    expect(skill).toContain('You are a code reviewer. Focus on correctness.');
  });

  it('generates SKILL.md from structured instructions', () => {
    const result = exportClaudeCode({
      name: 'my-agent',
      description: 'A helpful agent',
      instructions: {
        system: 'You are a code reviewer.',
        persona: { role: 'Senior Engineer', tone: 'professional' },
      },
    });

    const skill = result['skills/my-agent/SKILL.md'] as string;
    expect(skill).toContain('You are a code reviewer.');
    expect(skill).toContain('Senior Engineer');
  });

  it('generates .mcp.json from mcp servers', () => {
    const result = exportClaudeCode({
      name: 'my-agent',
      description: 'An agent',
      mcp: [
        { name: 'playwright', transport: 'stdio', command: 'npx', args: ['@playwright/mcp@latest'] },
        { name: 'gitlab', transport: 'streamable-http', url: 'https://gitlab.com/api/v4/mcp' },
      ],
    });

    expect(result['.mcp.json']).toEqual({
      playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
      gitlab: { type: 'http', url: 'https://gitlab.com/api/v4/mcp' },
    });
  });

  it('omits .mcp.json when no mcp servers defined', () => {
    const result = exportClaudeCode({
      name: 'my-agent',
      description: 'An agent',
    });

    expect(result['.mcp.json']).toBeUndefined();
  });

  it('includes metadata in plugin.json when present', () => {
    const result = exportClaudeCode({
      name: 'my-agent',
      description: 'An agent',
      metadata: {
        author: { name: 'Dan', email: 'dan@example.com' },
        license: 'MIT',
        repository: 'https://github.com/example/repo',
      },
    });

    expect(result['plugin.json']).toMatchObject({
      author: { name: 'Dan', email: 'dan@example.com' },
      license: 'MIT',
      repository: 'https://github.com/example/repo',
    });
  });

  it('includes guardrails behavioral rules in SKILL.md', () => {
    const result = exportClaudeCode({
      name: 'my-agent',
      description: 'An agent',
      instructions: 'You are helpful.',
      guardrails: {
        behavioral: ['Never share private data', 'Always cite sources'],
        prohibited_actions: ['Delete production data'],
      },
    });

    const skill = result['skills/my-agent/SKILL.md'] as string;
    expect(skill).toContain('Never share private data');
    expect(skill).toContain('Always cite sources');
    expect(skill).toContain('Delete production data');
  });
});
