import { describe, it, expect } from 'vitest';
import { exportCursor } from '../cursor.js';
import { exportCopilot } from '../copilot.js';
import { exportClaudeCode } from '../claude-code.js';
import { importCursor } from '../../importers/cursor.js';
import { importCopilot } from '../../importers/copilot.js';
import { importClaudeCode } from '../../importers/claude-code.js';

describe('round-trip: import → export', () => {
  it('cursor: import .mdc → agent data → export .mdc preserves instructions', () => {
    const original = '---\ndescription: TypeScript rules\nalwaysApply: true\n---\n\nUse strict mode.\n';
    const imported = importCursor({ content: original, fileName: 'typescript.mdc' });
    const exported = exportCursor(imported as any);
    const result = exported['.cursor/rules/typescript.mdc'] as string;

    expect(result).toContain('Use strict mode.');
    expect(result).toContain('description:');
  });

  it('cursor: preserves context globs through round-trip', () => {
    const original = '---\ndescription: TS helper\nglobs: "src/**/*.ts, tests/**/*.ts"\nalwaysApply: false\n---\n\nHelp with TS.\n';
    const imported = importCursor({ content: original, fileName: 'ts-helper.mdc' });

    // imported should have context
    expect(imported.context).toBeDefined();

    const exported = exportCursor(imported as any);
    const result = exported['.cursor/rules/ts-helper.mdc'] as string;
    expect(result).toContain('src/**/*.ts');
    expect(result).toContain('alwaysApply: false');
    expect(result).toContain('Help with TS.');
  });

  it('copilot: import → export preserves instructions', () => {
    const original = 'Use TypeScript strict mode.\nPrefer functional patterns.\n';
    const imported = importCopilot({ content: original, fileName: 'copilot-instructions.md' });
    const exported = exportCopilot(imported as any);
    const result = exported['.github/copilot-instructions.md'] as string;

    expect(result).toContain('Use TypeScript strict mode.');
    expect(result).toContain('Prefer functional patterns.');
  });

  it('copilot: preserves context globs through round-trip', () => {
    const original = '---\napplyTo: "**/*.ts"\n---\n\nUse strict mode.\n';
    const imported = importCopilot({ content: original, fileName: 'typescript.instructions.md' });

    expect(imported.context).toEqual([{ file: '**/*.ts' }]);

    const exported = exportCopilot(imported as any);
    const pathFile = exported['.github/instructions/typescript.instructions.md'] as string;
    expect(pathFile).toContain('applyTo:');
    expect(pathFile).toContain('**/*.ts');
  });

  it('claude-code: import → export preserves instructions in SKILL.md', () => {
    const original = '# My Agent\n\nAlways be helpful and concise.';
    const imported = importClaudeCode({ claudeMd: original });
    const exported = exportClaudeCode(imported as any);
    const skill = exported['skills/my-agent/SKILL.md'] as string;

    expect(skill).toContain('Always be helpful and concise.');
    expect(skill).toContain('name: my-agent');
  });

  it('claude-code: preserves MCP servers through round-trip', () => {
    const imported = importClaudeCode({
      claudeMd: '# Test\n\nHello.',
      mcpJson: {
        playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
        gitlab: { type: 'http', url: 'https://gitlab.com/api/v4/mcp' },
      },
    });

    expect(imported.mcp).toHaveLength(2);

    const exported = exportClaudeCode(imported as any);
    const mcpJson = exported['.mcp.json'] as Record<string, unknown>;
    expect(mcpJson).toBeDefined();
    expect(mcpJson['playwright']).toMatchObject({ command: 'npx' });
    expect(mcpJson['gitlab']).toMatchObject({ type: 'http', url: 'https://gitlab.com/api/v4/mcp' });
  });
});

describe('round-trip: export → import', () => {
  it('cursor: export agent → import result preserves name and instructions', () => {
    const agentData = {
      name: 'code-reviewer',
      description: 'Reviews code',
      instructions: 'Review all code carefully.',
    };

    const exported = exportCursor(agentData);
    const mdcContent = exported['.cursor/rules/code-reviewer.mdc'] as string;

    const imported = importCursor({ content: mdcContent, fileName: 'code-reviewer.mdc' });
    expect(imported.name).toBe('code-reviewer');
    expect(imported.instructions).toContain('Review all code carefully.');
  });

  it('copilot: export agent → import result preserves instructions', () => {
    const agentData = {
      name: 'helper',
      description: 'A helper',
      instructions: 'Be concise and accurate.',
    };

    const exported = exportCopilot(agentData);
    const mdContent = exported['.github/copilot-instructions.md'] as string;

    const imported = importCopilot({ content: mdContent, fileName: 'copilot-instructions.md' });
    expect(imported.instructions).toContain('Be concise and accurate.');
  });
});
