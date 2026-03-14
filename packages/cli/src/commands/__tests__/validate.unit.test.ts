import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('../../utils/output.js', () => ({
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  heading: vi.fn(),
}));

import {
  looksLikeSecret,
  collectStringValues,
  runChecks,
} from '../../commands/validate.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid agent object that passes schema validation. */
function minimalAgent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'test-agent',
    description: 'A test agent',
    model: 'claude-sonnet-4-20250514',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// looksLikeSecret
// ---------------------------------------------------------------------------

describe('looksLikeSecret', () => {
  it('detects sk- prefix', () => {
    expect(looksLikeSecret('sk-abc123')).toBe(true);
  });

  it('detects key- prefix', () => {
    expect(looksLikeSecret('key-something')).toBe(true);
  });

  it('detects AKIA prefix', () => {
    expect(looksLikeSecret('AKIAIOSFODNN7EXAMPLE')).toBe(true);
  });

  it('treats short strings without prefix as safe', () => {
    expect(looksLikeSecret('hello-world')).toBe(false);
    expect(looksLikeSecret('abc123XYZ')).toBe(false);
  });

  it('flags long string (>30) with upper+lower+digit and no spaces', () => {
    // 40 chars, mixed case + digits, no spaces
    const secret = 'aB3cD4eF5gH6iJ7kL8mN9oP0qRsTuVwXyZ1234';
    expect(secret.length).toBeGreaterThan(30);
    expect(looksLikeSecret(secret)).toBe(true);
  });

  it('treats long string with spaces as safe (prose)', () => {
    const prose =
      'This is a long string that has upper A and lower b and digit 1 but also spaces everywhere';
    expect(prose.length).toBeGreaterThan(30);
    expect(looksLikeSecret(prose)).toBe(false);
  });

  it('treats long string missing uppercase as safe', () => {
    const noUpper = 'abcdefghij1234567890abcdefghij12345';
    expect(noUpper.length).toBeGreaterThan(30);
    expect(looksLikeSecret(noUpper)).toBe(false);
  });

  it('treats long string missing digits as safe', () => {
    const noDigits = 'abcDefGhiJklMnoPqrStUvWxYzAbCdEfGh';
    expect(noDigits.length).toBeGreaterThan(30);
    expect(looksLikeSecret(noDigits)).toBe(false);
  });

  it('treats normal instruction text as safe', () => {
    expect(looksLikeSecret('You are a helpful assistant that answers questions.')).toBe(false);
  });

  it('treats empty string as safe', () => {
    expect(looksLikeSecret('')).toBe(false);
  });

  it('detects a secret embedded in a longer sentence', () => {
    expect(looksLikeSecret('Use token sk-proj-abc123def456 for auth')).toBe(true);
  });

  it('does not detect uppercase SK- prefix (case sensitive)', () => {
    expect(looksLikeSecret('SK-abc123')).toBe(false);
  });

  it('does not detect uppercase KEY- prefix (case sensitive)', () => {
    expect(looksLikeSecret('KEY-abc123')).toBe(false);
  });

  it('does not detect lowercase akia prefix (case sensitive)', () => {
    expect(looksLikeSecret('akia1234567890abcdef')).toBe(false);
  });

  it('detects a realistic AWS access key starting with AKIA', () => {
    expect(looksLikeSecret('AKIAIOSFODNN7EXAMPLE')).toBe(true);
  });

  // -- New prefix coverage (GitHub, Slack, Anthropic) --

  it('detects GitHub personal access token (ghp_)', () => {
    expect(looksLikeSecret('ghp_ABCdef123456789012345678901234567890')).toBe(true);
  });

  it('detects GitHub OAuth token (gho_)', () => {
    expect(looksLikeSecret('gho_ABCdef1234567890')).toBe(true);
  });

  it('detects GitHub server-to-server token (ghs_)', () => {
    expect(looksLikeSecret('ghs_ABCdef1234567890')).toBe(true);
  });

  it('detects GitHub user-to-server token (ghu_)', () => {
    expect(looksLikeSecret('ghu_ABCdef1234567890')).toBe(true);
  });

  it('detects Slack bot token (xoxb-)', () => {
    expect(looksLikeSecret('xoxb-123-456-abcdef')).toBe(true);
  });

  it('detects Slack user token (xoxp-)', () => {
    expect(looksLikeSecret('xoxp-123-456-abcdef')).toBe(true);
  });

  it('detects Anthropic API key (sk-ant-)', () => {
    expect(looksLikeSecret('sk-ant-api03-abcdef1234567890')).toBe(true);
  });

  // -- Embedded secret detection --

  it('detects embedded secret with surrounding text', () => {
    expect(looksLikeSecret('Use token sk-proj-abc123def456ghi789 for auth')).toBe(true);
  });

  // -- URL and file path exclusions for high-entropy heuristic --

  it('does not flag a URL as a secret', () => {
    expect(looksLikeSecret('https://tools.acme.com/Contracts/MCP/v2/EndpointForProcessing123')).toBe(false);
  });

  it('does not flag a file path as a secret', () => {
    expect(looksLikeSecret('/usr/local/lib/SomeVeryLongPathWithMixedCase123/config')).toBe(false);
  });

  it('does not flag a relative file path as a secret', () => {
    expect(looksLikeSecret('./some/VeryLongPathWithMixedCase123AndMoreCharacters/config')).toBe(false);
  });

  it('does not flag a parent-relative file path as a secret', () => {
    expect(looksLikeSecret('../some/VeryLongPathWithMixedCase123AndMoreChars/config')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// collectStringValues
// ---------------------------------------------------------------------------

describe('collectStringValues', () => {
  it('collects from a flat object', () => {
    const result = collectStringValues({ a: 'hello', b: 'world' });
    expect(result).toEqual([
      { path: 'a(key)', value: 'a' },
      { path: 'a', value: 'hello' },
      { path: 'b(key)', value: 'b' },
      { path: 'b', value: 'world' },
    ]);
  });

  it('collects from nested object with dotted paths', () => {
    const result = collectStringValues({ a: { b: 'deep' } });
    expect(result).toEqual([
      { path: 'a(key)', value: 'a' },
      { path: 'a.b(key)', value: 'b' },
      { path: 'a.b', value: 'deep' },
    ]);
  });

  it('collects from arrays with bracket notation', () => {
    const result = collectStringValues({ items: ['x', 'y'] });
    expect(result).toEqual([
      { path: 'items(key)', value: 'items' },
      { path: 'items[0]', value: 'x' },
      { path: 'items[1]', value: 'y' },
    ]);
  });

  it('handles mixed nesting (objects with arrays)', () => {
    const result = collectStringValues({
      top: {
        list: ['a', 'b'],
        key: 'c',
      },
    });
    expect(result).toEqual([
      { path: 'top(key)', value: 'top' },
      { path: 'top.list(key)', value: 'list' },
      { path: 'top.list[0]', value: 'a' },
      { path: 'top.list[1]', value: 'b' },
      { path: 'top.key(key)', value: 'key' },
      { path: 'top.key', value: 'c' },
    ]);
  });

  it('returns empty for non-string primitives', () => {
    const result = collectStringValues({ a: 42, b: true, c: null });
    expect(result).toEqual([
      { path: 'a(key)', value: 'a' },
      { path: 'b(key)', value: 'b' },
      { path: 'c(key)', value: 'c' },
    ]);
  });

  it('handles empty object', () => {
    expect(collectStringValues({})).toEqual([]);
  });

  it('collects a single string at root level with empty path', () => {
    const result = collectStringValues('root-value');
    expect(result).toEqual([{ path: '', value: 'root-value' }]);
  });

  it('collects object keys as values', () => {
    const results = collectStringValues({ 'sk-secret123': 'config-value' });
    const keyEntry = results.find(r => r.path.includes('(key)'));
    expect(keyEntry).toBeDefined();
    expect(keyEntry!.value).toBe('sk-secret123');
  });
});

// ---------------------------------------------------------------------------
// runChecks
// ---------------------------------------------------------------------------

describe('runChecks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 errors and 0 warnings for a valid minimal agent', () => {
    const { errors, warnings } = runChecks(minimalAgent(), '/tmp');
    expect(errors).toBe(0);
    expect(warnings).toBe(0);
  });

  it('returns errors > 0 for invalid agent (missing name)', () => {
    const { errors } = runChecks({ description: 'no name', model: 'gpt-4o-2024-08-06' }, '/tmp');
    expect(errors).toBeGreaterThan(0);
  });

  // -- model pinning --

  it('returns 1 warning for unpinned string model', () => {
    const { warnings } = runChecks(minimalAgent({ model: 'claude-sonnet' }), '/tmp');
    expect(warnings).toBe(1);
  });

  it('returns 0 warnings for pinned string model', () => {
    const { warnings } = runChecks(minimalAgent({ model: 'claude-sonnet-4-20250514' }), '/tmp');
    expect(warnings).toBe(0);
  });

  it('returns 1 warning for unpinned model in object form', () => {
    const { warnings } = runChecks(
      minimalAgent({ model: { id: 'gpt-4' } }),
      '/tmp',
    );
    expect(warnings).toBe(1);
  });

  it('returns 0 warnings for pinned model in object form', () => {
    const { warnings } = runChecks(
      minimalAgent({ model: { id: 'gpt-4-0125-preview' } }),
      '/tmp',
    );
    expect(warnings).toBe(0);
  });

  // -- model pinning: ModelShorthand form --

  it('returns 1 warning for unpinned model in shorthand default form', () => {
    const { warnings } = runChecks(
      minimalAgent({ model: { default: 'claude-sonnet' } }),
      '/tmp',
    );
    expect(warnings).toBe(1);
  });

  it('returns 0 warnings for pinned model in shorthand default form', () => {
    const { warnings } = runChecks(
      minimalAgent({ model: { default: 'claude-sonnet-4-20250514' } }),
      '/tmp',
    );
    expect(warnings).toBe(0);
  });

  it('returns 1 warning for unpinned fallback in shorthand form', () => {
    const { warnings } = runChecks(
      minimalAgent({ model: { default: 'claude-sonnet-4-20250514', fallback: 'gpt-4' } }),
      '/tmp',
    );
    expect(warnings).toBe(1);
  });

  it('returns 2 warnings for unpinned default and fallback in shorthand form', () => {
    const { warnings } = runChecks(
      minimalAgent({ model: { default: 'claude-sonnet', fallback: 'gpt-4' } }),
      '/tmp',
    );
    expect(warnings).toBe(2);
  });

  it('returns 0 warnings for pinned default and fallback in shorthand form', () => {
    const { warnings } = runChecks(
      minimalAgent({ model: { default: 'claude-sonnet-4-20250514', fallback: 'gpt-4-0125-preview' } }),
      '/tmp',
    );
    expect(warnings).toBe(0);
  });

  // -- secret detection --

  it('returns errors > 0 when a secret is in instructions', () => {
    const { errors } = runChecks(
      minimalAgent({ instructions: 'sk-secret1234567890' }),
      '/tmp',
    );
    expect(errors).toBeGreaterThan(0);
  });

  // -- context file checks --

  it('returns warnings > 0 for a missing context file reference', () => {
    const { warnings } = runChecks(
      minimalAgent({ context: [{ file: 'nonexistent-file.md' }] }),
      '/tmp',
    );
    expect(warnings).toBeGreaterThan(0);
  });

  it('returns 0 warnings when context file exists', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'validate-test-'));
    try {
      writeFileSync(join(tmpDir, 'knowledge.md'), '# Knowledge');
      const { warnings } = runChecks(
        minimalAgent({ context: [{ file: 'knowledge.md' }] }),
        tmpDir,
      );
      expect(warnings).toBe(0);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns 0 warnings when no context array is defined', () => {
    const { warnings } = runChecks(minimalAgent(), '/tmp');
    expect(warnings).toBe(0);
  });

  // -- instruction file checks --

  it('returns warnings > 0 when instruction file ref is missing', () => {
    const { warnings } = runChecks(
      minimalAgent({
        instructions: { system: { file: 'missing-system.md' } },
      }),
      '/tmp',
    );
    expect(warnings).toBeGreaterThan(0);
  });

  it('returns 0 warnings when instruction file ref exists', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'validate-test-'));
    try {
      writeFileSync(join(tmpDir, 'system.md'), '# System prompt');
      const { warnings } = runChecks(
        minimalAgent({
          instructions: { system: { file: 'system.md' } },
        }),
        tmpDir,
      );
      expect(warnings).toBe(0);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns 0 warnings when no instructions object is defined', () => {
    const { warnings } = runChecks(minimalAgent(), '/tmp');
    expect(warnings).toBe(0);
  });

  it('detects secrets in nested extension fields', () => {
    const { errors } = runChecks({
      name: 'test', description: 'test', model: 'gpt-4',
      extensions: { custom: { apiKey: 'sk-1234567890abcdef' } }
    }, '/tmp');
    expect(errors).toBeGreaterThan(0);
  });

  it('detects secret used as object key', () => {
    const { errors } = runChecks({
      name: 'test', description: 'test', model: 'gpt-4',
      extensions: { 'sk-1234567890abcdef': 'some-value' }
    }, '/tmp');
    expect(errors).toBeGreaterThan(0);
  });
});
