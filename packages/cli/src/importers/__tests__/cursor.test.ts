import { describe, it, expect } from 'vitest';
import { importCursor } from '../cursor.js';

describe('importCursor', () => {
  it('imports a .cursorrules file (legacy format)', () => {
    const result = importCursor({
      content: 'Always use TypeScript.\nPrefer functional patterns.',
      fileName: '.cursorrules',
    });

    expect(result.name).toBe('imported-agent');
    expect(result.instructions).toContain('Always use TypeScript');
    expect(result.model).toBe('gpt-4o-2024-08-06');
  });

  it('imports a .mdc file with frontmatter', () => {
    const result = importCursor({
      content: '---\ndescription: TypeScript rules\nglobs: "**/*.ts"\nalwaysApply: false\n---\n\nUse strict mode.',
      fileName: 'typescript.mdc',
    });

    expect(result.name).toBe('typescript');
    expect(result.description).toMatch(/TypeScript rules/);
    expect(result.instructions).toContain('Use strict mode.');
    expect(result.context).toEqual([{ file: '**/*.ts' }]);
  });

  it('handles alwaysApply: true with no globs', () => {
    const result = importCursor({
      content: '---\ndescription: Global rules\nalwaysApply: true\n---\n\nBe consistent.',
      fileName: 'global.mdc',
    });

    expect(result.context).toBeUndefined();
  });

  it('derives name from filename', () => {
    const result = importCursor({
      content: '---\ndescription: React rules\n---\n\nUse hooks.',
      fileName: 'react-patterns.mdc',
    });

    expect(result.name).toBe('react-patterns');
  });

  it('stores cursor-specific fields in extensions', () => {
    const result = importCursor({
      content: '---\ndescription: Test\nalwaysApply: true\n---\n\nHello.',
      fileName: 'test.mdc',
    });

    expect(result.extensions).toEqual({
      cursor: { alwaysApply: true },
    });
  });
});
