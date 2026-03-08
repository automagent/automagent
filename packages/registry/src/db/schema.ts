import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  scope: text('scope'),
  description: text('description').notNull(),
  latestVersion: text('latest_version').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agents_scope_name_idx').on(table.scope, table.name),
]);

export const agentVersions = pgTable('agent_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  definition: jsonb('definition').notNull(),
  readme: text('readme'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('agent_versions_agent_version_idx').on(table.agentId, table.version),
]);

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
}, (table) => [
  uniqueIndex('tags_agent_tag_idx').on(table.agentId, table.tag),
]);
