import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/output.js', () => ({
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  heading: vi.fn(),
}));

vi.mock('../../utils/credentials.js', () => ({
  getAuthHeaders: vi.fn(() => ({})),
}));

import { parseAgentRef } from '../../commands/pull.js';

describe('parseAgentRef', () => {
  it('parses @acme/my-agent without version', () => {
    expect(parseAgentRef('@acme/my-agent')).toEqual({
      scope: '@acme',
      name: 'my-agent',
      version: undefined,
    });
  });

  it('parses @acme/my-agent:1.0.0 with version', () => {
    expect(parseAgentRef('@acme/my-agent:1.0.0')).toEqual({
      scope: '@acme',
      name: 'my-agent',
      version: '1.0.0',
    });
  });

  it('parses @org/complex-name-123:^2.1.0 with semver range', () => {
    expect(parseAgentRef('@org/complex-name-123:^2.1.0')).toEqual({
      scope: '@org',
      name: 'complex-name-123',
      version: '^2.1.0',
    });
  });

  it('parses unscoped my-agent as _ scope', () => {
    expect(parseAgentRef('my-agent')).toEqual({
      scope: '_',
      name: 'my-agent',
      version: undefined,
    });
  });

  it('throws on ref without @ prefix (acme/my-agent)', () => {
    expect(() => parseAgentRef('acme/my-agent')).toThrow('Invalid agent reference');
  });

  it('throws on empty string', () => {
    expect(() => parseAgentRef('')).toThrow('Invalid agent reference');
  });

  it('throws on @acme/ with no name', () => {
    expect(() => parseAgentRef('@acme/')).toThrow('Invalid agent reference');
  });

  // Unscoped refs (maps to _ scope on hub)
  it('parses unscoped name without version', () => {
    expect(parseAgentRef('support-triage')).toEqual({
      scope: '_',
      name: 'support-triage',
      version: undefined,
    });
  });

  it('parses unscoped name@version (npm convention)', () => {
    expect(parseAgentRef('support-triage@0.1.0')).toEqual({
      scope: '_',
      name: 'support-triage',
      version: '0.1.0',
    });
  });

  it('parses unscoped name:version', () => {
    expect(parseAgentRef('support-triage:0.1.0')).toEqual({
      scope: '_',
      name: 'support-triage',
      version: '0.1.0',
    });
  });

  // Scoped refs with @ version delimiter (npm convention)
  it('parses @scope/name@version (npm convention)', () => {
    expect(parseAgentRef('@acme/my-agent@1.0.0')).toEqual({
      scope: '@acme',
      name: 'my-agent',
      version: '1.0.0',
    });
  });
});
