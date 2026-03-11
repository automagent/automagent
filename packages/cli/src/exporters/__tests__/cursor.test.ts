import { describe, it, expect } from 'vitest';
import { exportCursor } from '../cursor.js';

describe('exportCursor', () => {
  it('generates a single .mdc rule file from agent definition', () => {
    const result = exportCursor({
      name: 'code-reviewer',
      description: 'Reviews code for quality',
      instructions: 'You are a code reviewer. Focus on correctness.',
    });

    const rule = result['.cursor/rules/code-reviewer.mdc'] as string;
    expect(rule).toContain('---');
    expect(rule).toContain('description: Reviews code for quality');
    expect(rule).toContain('alwaysApply: true');
    expect(rule).toContain('You are a code reviewer. Focus on correctness.');
  });

  it('includes context file globs when present', () => {
    const result = exportCursor({
      name: 'ts-agent',
      description: 'TypeScript helper',
      instructions: 'Help with TypeScript.',
      context: [{ file: 'src/**/*.ts' }, { file: 'tsconfig.json' }],
    });

    const rule = result['.cursor/rules/ts-agent.mdc'] as string;
    expect(rule).toContain('globs: src/**/*.ts, tsconfig.json');
    expect(rule).toContain('alwaysApply: false');
  });

  it('includes guardrails as rules in body', () => {
    const result = exportCursor({
      name: 'safe-agent',
      description: 'A safe agent',
      instructions: 'Be helpful.',
      guardrails: { behavioral: ['Always be polite'] },
    });

    const rule = result['.cursor/rules/safe-agent.mdc'] as string;
    expect(rule).toContain('Always be polite');
  });

  it('handles structured instructions with persona', () => {
    const result = exportCursor({
      name: 'persona-agent',
      description: 'Agent with persona',
      instructions: {
        system: 'You are an expert.',
        persona: { role: 'Architect', expertise: ['React', 'Node'] },
      },
    });

    const rule = result['.cursor/rules/persona-agent.mdc'] as string;
    expect(rule).toContain('You are an expert.');
    expect(rule).toContain('Architect');
  });
});
