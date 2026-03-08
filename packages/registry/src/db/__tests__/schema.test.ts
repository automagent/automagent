import { describe, it, expect } from 'vitest';
import { agents, agentVersions, tags } from '../schema.js';

describe('database schema', () => {
  it('agents table has required columns', () => {
    const cols = Object.keys(agents);
    expect(cols).toContain('id');
    expect(cols).toContain('name');
    expect(cols).toContain('scope');
    expect(cols).toContain('description');
    expect(cols).toContain('latestVersion');
    expect(cols).toContain('createdAt');
    expect(cols).toContain('updatedAt');
  });

  it('agentVersions table has required columns', () => {
    const cols = Object.keys(agentVersions);
    expect(cols).toContain('id');
    expect(cols).toContain('agentId');
    expect(cols).toContain('version');
    expect(cols).toContain('definition');
    expect(cols).toContain('readme');
    expect(cols).toContain('createdAt');
  });

  it('tags table has required columns', () => {
    const cols = Object.keys(tags);
    expect(cols).toContain('id');
    expect(cols).toContain('agentId');
    expect(cols).toContain('tag');
  });
});
