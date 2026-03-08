import { describe, it, expect, beforeEach } from 'vitest';
import { app } from '../app.js';
import { db, schema } from '../db/index.js';

const validDefinition = {
  name: 'test-agent',
  description: 'A test agent',
  model: 'claude-sonnet',
  instructions: 'You are a helpful assistant.',
};

const invalidDefinition = {
  // missing required fields
  foo: 'bar',
};

async function pushAgent(
  scope: string,
  name: string,
  version: string,
  definition: Record<string, unknown> = validDefinition,
  extras: { readme?: string; tags?: string[] } = {},
) {
  return app.request(`/v1/agents/${scope}/${name}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, definition, ...extras }),
  });
}

describe('Agent API routes', () => {
  beforeEach(async () => {
    // Clean tables in correct order (respecting foreign keys)
    await db.delete(schema.tags);
    await db.delete(schema.agentVersions);
    await db.delete(schema.agents);
  });

  describe('PUT /v1/agents/:scope/:name', () => {
    it('creates a new agent and returns 201', async () => {
      const res = await pushAgent('myorg', 'my-agent', '1.0.0', validDefinition, {
        readme: '# My Agent',
        tags: ['chat', 'helper'],
      });
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toMatchObject({ name: 'my-agent', scope: 'myorg', version: '1.0.0' });
    });

    it('adds a new version to an existing agent and returns 200', async () => {
      await pushAgent('myorg', 'my-agent', '1.0.0');
      const res = await pushAgent('myorg', 'my-agent', '1.1.0');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({ version: '1.1.0' });
    });

    it('rejects an invalid definition with 400', async () => {
      const res = await pushAgent('myorg', 'bad-agent', '1.0.0', invalidDefinition);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Invalid agent definition');
      expect(body.details).toBeDefined();
    });

    it('rejects a duplicate version with 409', async () => {
      await pushAgent('myorg', 'my-agent', '1.0.0');
      const res = await pushAgent('myorg', 'my-agent', '1.0.0');
      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('Version already exists');
    });
  });

  describe('GET /v1/agents/:scope/:name', () => {
    it('returns the latest version', async () => {
      await pushAgent('myorg', 'my-agent', '1.0.0');
      await pushAgent('myorg', 'my-agent', '2.0.0');

      const res = await app.request('/v1/agents/myorg/my-agent');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.version).toBe('2.0.0');
      expect(body.name).toBe('my-agent');
      expect(body.scope).toBe('myorg');
      expect(body.definition).toMatchObject(validDefinition);
    });

    it('returns a specific version when ?version= is provided', async () => {
      await pushAgent('myorg', 'my-agent', '1.0.0');
      await pushAgent('myorg', 'my-agent', '2.0.0');

      const res = await app.request('/v1/agents/myorg/my-agent?version=1.0.0');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.version).toBe('1.0.0');
    });

    it('returns 404 for an unknown agent', async () => {
      const res = await app.request('/v1/agents/myorg/nonexistent');
      expect(res.status).toBe(404);
    });

    it('returns 404 for an unknown version', async () => {
      await pushAgent('myorg', 'my-agent', '1.0.0');
      const res = await app.request('/v1/agents/myorg/my-agent?version=9.9.9');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /v1/agents/:scope/:name/versions', () => {
    it('lists all versions for an agent', async () => {
      await pushAgent('myorg', 'my-agent', '1.0.0');
      await pushAgent('myorg', 'my-agent', '1.1.0');
      await pushAgent('myorg', 'my-agent', '2.0.0');

      const res = await app.request('/v1/agents/myorg/my-agent/versions');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.name).toBe('my-agent');
      expect(body.scope).toBe('myorg');
      expect(body.versions).toHaveLength(3);
      // Ordered by createdAt desc, so newest first
      expect(body.versions[0].version).toBe('2.0.0');
    });

    it('returns 404 for an unknown agent', async () => {
      const res = await app.request('/v1/agents/myorg/nonexistent/versions');
      expect(res.status).toBe(404);
    });
  });
});
