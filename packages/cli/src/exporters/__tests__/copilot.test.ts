import { describe, it, expect } from 'vitest';
import { exportCopilot } from '../copilot.js';

describe('exportCopilot', () => {
  it('generates copilot-instructions.md from agent definition', () => {
    const result = exportCopilot({
      name: 'code-reviewer',
      description: 'Reviews code for quality',
      instructions: 'You are a code reviewer. Focus on correctness.',
    });

    const md = result['.github/copilot-instructions.md'] as string;
    expect(md).toContain('You are a code reviewer. Focus on correctness.');
  });

  it('includes guardrails in the instructions', () => {
    const result = exportCopilot({
      name: 'safe-agent',
      description: 'A safe agent',
      instructions: 'Be helpful.',
      guardrails: {
        behavioral: ['Always be polite'],
        prohibited_actions: ['Delete files'],
      },
    });

    const md = result['.github/copilot-instructions.md'] as string;
    expect(md).toContain('Always be polite');
    expect(md).toContain('Delete files');
  });

  it('generates path-specific instructions from context globs', () => {
    const result = exportCopilot({
      name: 'ts-agent',
      description: 'TypeScript helper',
      instructions: 'Help with TypeScript.',
      context: [{ file: 'src/**/*.ts' }],
    });

    const files = Object.keys(result);
    expect(files).toContain('.github/copilot-instructions.md');
    expect(files).toContain('.github/instructions/ts-agent.instructions.md');

    const pathInstr = result['.github/instructions/ts-agent.instructions.md'] as string;
    expect(pathInstr).toContain('applyTo: "src/**/*.ts"');
  });

  it('handles structured instructions', () => {
    const result = exportCopilot({
      name: 'my-agent',
      description: 'An agent',
      instructions: {
        system: 'You are an expert.',
        persona: { role: 'Architect' },
      },
    });

    const md = result['.github/copilot-instructions.md'] as string;
    expect(md).toContain('You are an expert.');
    expect(md).toContain('Architect');
  });
});
