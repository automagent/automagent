import { describe, it, expect } from 'vitest';
import { importClaudeCode } from '../claude-code.js';

describe('importClaudeCode', () => {
  it('imports a CLAUDE.md file as instructions', () => {
    const result = importClaudeCode({
      claudeMd: '# My Project\n\nAlways use TypeScript strict mode.\n\n## Commands\n\nnpm run build',
    });

    expect(result.name).toBe('my-project');
    expect(result.description).toMatch(/Imported from Claude Code/);
    expect(result.instructions).toContain('Always use TypeScript strict mode');
  });

  it('extracts agent name from first heading', () => {
    const result = importClaudeCode({
      claudeMd: '# Code Reviewer\n\nReview all PRs.',
    });

    expect(result.name).toBe('code-reviewer');
  });

  it('imports MCP servers from .mcp.json', () => {
    const result = importClaudeCode({
      claudeMd: 'Be helpful.',
      mcpJson: {
        playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
        gitlab: { type: 'http', url: 'https://gitlab.com/api/v4/mcp' },
      },
    });

    expect(result.mcp).toHaveLength(2);
    expect((result.mcp as unknown[])[0]).toMatchObject({
      name: 'playwright',
      transport: 'stdio',
      command: 'npx',
    });
    expect((result.mcp as unknown[])[1]).toMatchObject({
      name: 'gitlab',
      transport: 'streamable-http',
      url: 'https://gitlab.com/api/v4/mcp',
    });
  });

  it('stores permissions in extensions', () => {
    const result = importClaudeCode({
      claudeMd: 'Be helpful.',
      settingsJson: {
        permissions: { allow: ['Bash(npm:*)', 'Bash(git:*)'] },
      },
    });

    expect(result.extensions).toEqual({
      'claude-code': {
        permissions: { allow: ['Bash(npm:*)', 'Bash(git:*)'] },
      },
    });
  });

  it('defaults model to claude-sonnet-4-20250514', () => {
    const result = importClaudeCode({ claudeMd: 'Hello.' });
    expect(result.model).toBe('claude-sonnet-4-20250514');
  });

  it('falls back to imported-agent when no heading', () => {
    const result = importClaudeCode({ claudeMd: 'No heading here.' });
    expect(result.name).toBe('imported-agent');
  });
});
