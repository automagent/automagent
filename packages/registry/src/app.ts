import { Hono } from 'hono';
import { agentsRouter } from './routes/agents.js';
import { searchRouter } from './routes/search.js';

export const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/v1/agents', agentsRouter);
app.route('/v1/search', searchRouter);
