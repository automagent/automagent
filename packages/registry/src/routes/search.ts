import { Hono } from 'hono';
import { eq, and, desc, ilike, inArray, or, count } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

export const searchRouter = new Hono();

searchRouter.get('/', async (c) => {
  const q = c.req.query('q');
  const tagsParam = c.req.query('tags');
  const limit = Math.min(Number(c.req.query('limit') ?? 20), 100);
  const offset = Number(c.req.query('offset') ?? 0);

  const conditions: ReturnType<typeof eq>[] = [];

  // If tags provided, find matching agent IDs first
  if (tagsParam) {
    const tagList = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      const tagRows = await db
        .select({ agentId: schema.tags.agentId })
        .from(schema.tags)
        .where(inArray(schema.tags.tag, tagList));

      const agentIds = [...new Set(tagRows.map((r) => r.agentId))];
      if (agentIds.length === 0) {
        return c.json({ agents: [], total: 0, limit, offset });
      }
      conditions.push(inArray(schema.agents.id, agentIds));
    }
  }

  // If q provided, filter by name or description
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        ilike(schema.agents.name, pattern),
        ilike(schema.agents.description, pattern),
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
      .where(whereClause)
      .orderBy(desc(schema.agents.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(schema.agents).where(whereClause),
  ]);

  return c.json({
    agents,
    total: totalResult[0]!.count,
    limit,
    offset,
  });
});
