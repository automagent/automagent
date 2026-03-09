import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/output.js', () => ({
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  heading: vi.fn(),
}));

import { validateName, buildYaml, buildQuickConfig } from '../../commands/init.js';

describe('validateName', () => {
  it('accepts my-agent', () => {
    expect(validateName('my-agent')).toBe(true);
  });

  it('accepts a single character', () => {
    expect(validateName('a')).toBe(true);
  });

  it('accepts agent-123', () => {
    expect(validateName('agent-123')).toBe(true);
  });

  it('accepts name at max length (128 chars)', () => {
    expect(validateName('a'.repeat(128))).toBe(true);
  });

  it('rejects name over max length (129 chars)', () => {
    expect(validateName('a'.repeat(129))).toBe(false);
  });

  it('rejects uppercase letters', () => {
    expect(validateName('MyAgent')).toBe(false);
  });

  it('rejects leading hyphen', () => {
    expect(validateName('-agent')).toBe(false);
  });

  it('rejects trailing hyphen', () => {
    expect(validateName('agent-')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(validateName('my agent')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateName('')).toBe(false);
  });
});

describe('buildYaml', () => {
  const config = {
    apiVersion: 'v1',
    name: 'test-agent',
    description: 'A test agent',
    model: 'claude-sonnet-4-20250514',
    instructions: 'Be helpful.',
  };

  it('starts with yaml-language-server comment', () => {
    const yaml = buildYaml(config);
    expect(yaml.startsWith('# yaml-language-server')).toBe(true);
  });

  it('contains the agent name', () => {
    const yaml = buildYaml(config);
    expect(yaml).toContain('test-agent');
  });

  it('contains the model', () => {
    const yaml = buildYaml(config);
    expect(yaml).toContain('claude-sonnet-4-20250514');
  });

  it('contains the instructions', () => {
    const yaml = buildYaml(config);
    expect(yaml).toContain('Be helpful.');
  });

  it('contains the description', () => {
    const yaml = buildYaml(config);
    expect(yaml).toContain('A test agent');
  });
});

describe('buildQuickConfig', () => {
  it('returns defaults when no opts provided', () => {
    const config = buildQuickConfig({});
    expect(config).toEqual({
      apiVersion: 'v1',
      name: 'my-agent',
      description: 'A helpful assistant',
      model: 'claude-sonnet-4-20250514',
      instructions: 'You are a helpful assistant.',
    });
  });

  it('uses custom name', () => {
    const config = buildQuickConfig({ name: 'custom-agent' });
    expect(config.name).toBe('custom-agent');
  });

  it('uses custom model', () => {
    const config = buildQuickConfig({ model: 'gpt-4o' });
    expect(config.model).toBe('gpt-4o');
  });

  it('uses custom description', () => {
    const config = buildQuickConfig({ description: 'My custom bot' });
    expect(config.description).toBe('My custom bot');
  });

  it('throws on invalid name', () => {
    expect(() => buildQuickConfig({ name: 'INVALID NAME' })).toThrow('Invalid agent name');
  });
});
