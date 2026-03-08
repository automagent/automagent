import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { app } from '../app.js';
import { db, schema } from '../db/index.js';

const analystDefinition = {
  name: 'data-analyst',
  description: 'Analyzes datasets and produces insights',
  model: 'claude-sonnet',
  instructions: 'You are a data analyst.',
};

const reviewerDefinition = {
  name: 'code-reviewer',
  description: 'Reviews pull requests for quality',
  model: 'claude-sonnet',
  instructions: 'You are a code reviewer.',
};

async function pushAgent(
  scope: string,
  name: string,
  version: string,
  definition: Record<string, unknown>,
  extras: { readme?: string; tags?: string[] } = {},
) {
  return app.request(`/v1/agents/${scope}/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, definition, ...extras }),
  });
}

async function cleanTables() {
  await db.delete(schema.tags);
  await db.delete(schema.agentVersions);
  await db.delete(schema.agents);
}

describe('List and Search API', () => {
  beforeEach(async () => {
    await cleanTables();
    await pushAgent('myorg', 'data-analyst', '1.0.0', analystDefinition, {
      tags: ['analytics', 'data'],
    });
    await pushAgent('myorg', 'code-reviewer', '1.0.0', reviewerDefinition, {
      tags: ['code', 'review'],
    });
  });

  afterAll(async () => {
    await cleanTables();
  });

  describe('GET /v1/agents (list)', () => {
    it('lists all agents', async () => {
      const res = await app.request('/v1/agents');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: unknown[]; total: number; limit: number; offset: number };
      expect(body.agents).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.limit).toBe(20);
      expect(body.offset).toBe(0);
    });

    it('respects pagination with limit=1', async () => {
      const res = await app.request('/v1/agents?limit=1');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: unknown[]; total: number };
      expect(body.agents).toHaveLength(1);
      expect(body.total).toBe(2);
    });

    it('respects offset', async () => {
      const res = await app.request('/v1/agents?limit=1&offset=1');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: unknown[]; total: number };
      expect(body.agents).toHaveLength(1);
      expect(body.total).toBe(2);
    });
  });

  describe('GET /v1/search', () => {
    it('searches by name substring', async () => {
      const res = await app.request('/v1/search?q=data');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: Array<{ name: string }>; total: number };
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0]!.name).toBe('data-analyst');
      expect(body.total).toBe(1);
    });

    it('searches by description substring', async () => {
      const res = await app.request('/v1/search?q=pull%20requests');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: Array<{ name: string }>; total: number };
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0]!.name).toBe('code-reviewer');
    });

    it('searches by tag', async () => {
      const res = await app.request('/v1/search?tags=analytics');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: Array<{ name: string }>; total: number };
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0]!.name).toBe('data-analyst');
    });

    it('searches by multiple tags (OR)', async () => {
      const res = await app.request('/v1/search?tags=analytics,code');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: unknown[]; total: number };
      expect(body.agents).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it('combines q and tags with AND logic', async () => {
      const res = await app.request('/v1/search?q=analyst&tags=data');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: Array<{ name: string }>; total: number };
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0]!.name).toBe('data-analyst');
    });

    it('returns empty results for non-matching query', async () => {
      const res = await app.request('/v1/search?q=nonexistent');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: unknown[]; total: number };
      expect(body.agents).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it('returns empty results for non-matching tag', async () => {
      const res = await app.request('/v1/search?tags=nonexistent');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: unknown[]; total: number };
      expect(body.agents).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    it('is case-insensitive for text search', async () => {
      const res = await app.request('/v1/search?q=DATA');
      expect(res.status).toBe(200);
      const body = await res.json() as { agents: Array<{ name: string }>; total: number };
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0]!.name).toBe('data-analyst');
    });
  });
});
