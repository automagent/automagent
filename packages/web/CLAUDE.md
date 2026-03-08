# CLAUDE.md

## What This Is

`@automagent/web` — React + Vite SPA for browsing agent definitions in the automagent registry.

## Commands

```bash
npm run dev            # Vite dev server on :5173 (proxies /v1/* to registry on :3000)
npm run build          # TypeScript check + Vite production build to dist/
npm run preview        # Preview production build locally
npm run lint           # Type-check with tsc --noEmit
```

## Architecture

React 19 + Vite 6 + Tailwind CSS 4 + React Router 7. Builds to static assets served by the registry's Hono server.

### Pages
- `/` — Agent listing with search and pagination
- `/:scope/:name` — Agent detail with YAML definition, readme, version selector
- `/:scope/:name/versions` — Version history table

### Key Files
- `src/main.tsx` — Entry point, BrowserRouter setup
- `src/App.tsx` — Route definitions with lazy-loaded pages
- `src/api.ts` — Typed fetch client for registry API
- `src/components/Layout.tsx` — Header, footer, outlet
- `src/pages/HomePage.tsx` — Agent grid, search, pagination
- `src/pages/AgentDetailPage.tsx` — Definition viewer, readme, version picker
- `src/pages/VersionsPage.tsx` — Version history table

### API Integration
All data comes from the registry API (`/v1/agents`, `/v1/search`). In dev, Vite proxies these to `localhost:3000`. In production, the registry serves both the API and the static assets.

### Scope Handling
Scopes are stored in the DB with `@` prefix (e.g., `@demo`). URL paths use the scope without `@` (e.g., `/demo/my-agent`). Pages prepend `@` when calling the API.
