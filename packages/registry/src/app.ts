import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { agentsRouter } from './routes/agents.js';
import { searchRouter } from './routes/search.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webDistRoot = resolve(__dirname, '../../web/dist');

export const app = new Hono();

// CORS for development (e.g. Vite on :5173 calling registry on :3000)
app.use('*', cors());

// API routes
app.get('/health', (c) => c.json({ status: 'ok' }));
app.route('/v1/agents', agentsRouter);
app.route('/v1/search', searchRouter);

// Static file serving for the web UI
app.use('*', serveStatic({ root: webDistRoot, rewriteRequestPath: (path) => path }));

// SPA fallback: serve index.html for any unmatched route (client-side routing)
app.use('*', serveStatic({ root: webDistRoot, rewriteRequestPath: () => '/index.html' }));
