import { describe, it, expect } from 'vitest';
import { importCopilot } from '../copilot.js';

describe('importCopilot', () => {
  it('imports copilot-instructions.md as instructions', () => {
    const result = importCopilot({
      content: 'Use TypeScript strict mode.\nPrefer functional patterns.',
      fileName: 'copilot-instructions.md',
    });

    expect(result.name).toBe('imported-agent');
    expect(result.instructions).toContain('Use TypeScript strict mode');
    expect(result.model).toBe('gpt-4o-2024-11-20');
  });

  it('imports path-specific instructions with applyTo', () => {
    const result = importCopilot({
      content: '---\napplyTo: "**/*.ts,**/*.tsx"\n---\n\nUse strict mode.',
      fileName: 'typescript.instructions.md',
    });

    expect(result.name).toBe('typescript');
    expect(result.context).toEqual([
      { file: '**/*.ts' },
      { file: '**/*.tsx' },
    ]);
    expect(result.instructions).toContain('Use strict mode.');
  });

  it('stores excludeAgent in extensions', () => {
    const result = importCopilot({
      content: '---\napplyTo: "**/*.ts"\nexcludeAgent: "code-review"\n---\n\nHello.',
      fileName: 'test.instructions.md',
    });

    expect(result.extensions).toEqual({
      copilot: { excludeAgent: 'code-review' },
    });
  });

  it('handles plain markdown without frontmatter', () => {
    const result = importCopilot({
      content: 'Just some instructions without frontmatter.',
      fileName: 'copilot-instructions.md',
    });

    expect(result.instructions).toBe('Just some instructions without frontmatter.');
  });
});
