import { Hono } from 'hono';
import { eq, and, desc, count } from 'drizzle-orm';
import { validate } from '@automagent/schema';
import { db, schema } from '../db/index.js';

export const agentsRouter = new Hono();

// GET / — List all agents (paginated)
agentsRouter.get('/', async (c) => {
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  const offset = Number(c.req.query('offset') ?? 0);

  const [agents, totalResult] = await Promise.all([
    db
      .select({
        name: schema.agents.name,
        scope: schema.agents.scope,
        description: schema.agents.description,
        latestVersion: schema.agents.latestVersion,
        updatedAt: schema.agents.updatedAt,
      })
      .from(schema.agents)
      .orderBy(desc(schema.agents.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(schema.agents),
  ]);

  return c.json({
    agents,
    total: totalResult[0]!.count,
    limit,
    offset,
  });
});

// PUT /:scope/:name — Push a new version
agentsRouter.put('/:scope/:name', async (c) => {
  const { scope, name } = c.req.param();
  const body = await c.req.json<{
    version: string;
    definition: Record<string, unknown>;
    readme?: string;
    tags?: string[];
  }>();

  const { version, definition, readme, tags: bodyTags } = body;

  // Validate the agent definition
  const result = validate(definition);
  if (!result.valid) {
    return c.json({ error: 'Invalid agent definition', details: result.errors }, 400);
  }

  // Check if agent already exists
  const existing = await db
    .select()
    .from(schema.agents)
    .where(and(eq(schema.agents.scope, scope), eq(schema.agents.name, name)))
    .limit(1);

  if (existing.length > 0) {
    const agent = existing[0]!;

    // Check for duplicate version
    const existingVersion = await db
      .select()
      .from(schema.agentVersions)
      .where(and(eq(schema.agentVersions.agentId, agent.id), eq(schema.agentVersions.version, version)))
      .limit(1);

    if (existingVersion.length > 0) {
      return c.json({ error: 'Version already exists' }, 409);
    }

    // Insert new version
    await db.insert(schema.agentVersions).values({
      agentId: agent.id,
      version,
      definition,
      readme: readme ?? null,
    });

    // Update agent's latestVersion and updatedAt
    await db
      .update(schema.agents)
      .set({ latestVersion: version, updatedAt: new Date() })
      .where(eq(schema.agents.id, agent.id));

    // Sync tags: delete existing, insert new
    await db.delete(schema.tags).where(eq(schema.tags.agentId, agent.id));
    if (bodyTags && bodyTags.length > 0) {
      await db.insert(schema.tags).values(
        bodyTags.map((tag) => ({ agentId: agent.id, tag })),
      );
    }

    return c.json({ message: 'Version added', name, scope, version }, 200);
  }

  // New agent: insert agent, version, and tags
  const [newAgent] = await db
    .insert(schema.agents)
    .values({
      name,
      scope,
      description: (definition as Record<string, unknown>).description as string ?? '',
      latestVersion: version,
    })
    .returning();

  await db.insert(schema.agentVersions).values({
    agentId: newAgent!.id,
    version,
    definition,
    readme: readme ?? null,
  });

  if (bodyTags && bodyTags.length > 0) {
    await db.insert(schema.tags).values(
      bodyTags.map((tag) => ({ agentId: newAgent!.id, tag })),
    );
  }

  return c.json({ message: 'Agent created', name, scope, version }, 201);
});

// GET /:scope/:name — Pull latest or specific version
agentsRouter.get('/:scope/:name', async (c) => {
  const { scope, name } = c.req.param();
  const versionParam = c.req.query('version');

  // Find the agent
  const existing = await db
    .select()
    .from(schema.agents)
    .where(and(eq(schema.agents.scope, scope), eq(schema.agents.name, name)))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const agent = existing[0]!;

  let versionRow;
  if (versionParam) {
    const rows = await db
      .select()
      .from(schema.agentVersions)
      .where(and(eq(schema.agentVersions.agentId, agent.id), eq(schema.agentVersions.version, versionParam)))
      .limit(1);
    versionRow = rows[0];
  } else {
    const rows = await db
      .select()
      .from(schema.agentVersions)
      .where(eq(schema.agentVersions.agentId, agent.id))
      .orderBy(desc(schema.agentVersions.createdAt))
      .limit(1);
    versionRow = rows[0];
  }

  if (!versionRow) {
    return c.json({ error: 'Version not found' }, 404);
  }

  return c.json({
    name: agent.name,
    scope: agent.scope,
    version: versionRow.version,
    definition: versionRow.definition,
    readme: versionRow.readme,
    createdAt: versionRow.createdAt,
  });
});

// GET /:scope/:name/versions — List all versions
agentsRouter.get('/:scope/:name/versions', async (c) => {
  const { scope, name } = c.req.param();

  const existing = await db
    .select()
    .from(schema.agents)
    .where(and(eq(schema.agents.scope, scope), eq(schema.agents.name, name)))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const agent = existing[0]!;

  const versions = await db
    .select({ version: schema.agentVersions.version, createdAt: schema.agentVersions.createdAt })
    .from(schema.agentVersions)
    .where(eq(schema.agentVersions.agentId, agent.id))
    .orderBy(desc(schema.agentVersions.createdAt));

  return c.json({
    name: agent.name,
    scope: agent.scope,
    versions: versions.map((v) => ({ version: v.version, createdAt: v.createdAt })),
  });
});
