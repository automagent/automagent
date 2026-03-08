# Web UI for Browsing Agent Definitions — Design

**Goal:** Add a React + Vite SPA to the automagent monorepo that provides a browser-based UI for discovering and inspecting agent definitions stored in the registry.

**Architecture:** New `packages/web` workspace. React 19 + Vite + TypeScript + Tailwind CSS 4. Builds to static assets served by the Hono registry server. Client-side routing with React Router. No server-side rendering — read-only UI backed entirely by existing registry API endpoints.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS 4, React Router, react-syntax-highlighter, react-markdown

---

## Pages

| Route | Page | Data Source |
|-------|------|-------------|
| `/` | Agent listing with search + tag filter | `GET /v1/agents` + `GET /v1/search` |
| `/:scope/:name` | Agent detail — description, YAML, readme, version picker | `GET /v1/agents/:scope/:name` |
| `/:scope/:name/versions` | Version history table | `GET /v1/agents/:scope/:name/versions` |

## Components

```
App
├── Layout (header with logo + search bar, main content)
├── HomePage
│   ├── SearchBar (debounced, hits /v1/search)
│   ├── TagFilter (clickable tag chips)
│   └── AgentGrid (cards with name, scope, description, version)
├── AgentDetailPage
│   ├── AgentHeader (scope/name, description, latest version badge)
│   ├── DefinitionViewer (syntax-highlighted YAML)
│   ├── ReadmeViewer (rendered markdown)
│   └── VersionSelector (dropdown, loads specific version)
└── VersionsPage
    └── VersionTable (version, date, link to view)
```

## Registry Integration

Hono serves built static assets from `packages/web/dist`. API routes (`/v1/*`, `/health`) registered first take priority. SPA fallback serves `index.html` for all other routes.

## API Contract

All existing endpoints are sufficient — no new API routes needed.
