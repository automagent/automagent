import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL ?? 'postgres://automagent:automagent@localhost:5434/automagent';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export { schema };
