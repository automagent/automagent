# Web UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a React + Vite SPA in `packages/web` for browsing agent definitions from the registry.

**Architecture:** New workspace package with React 19 + Vite + Tailwind CSS 4. Static assets served by Hono registry. Client-side routing via React Router.

**Tech Stack:** React 19, Vite 6, TypeScript, Tailwind CSS 4, React Router 7, react-syntax-highlighter, react-markdown

---

### Task 1: Scaffold packages/web

**Files:**
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/vite.config.ts`
- Create: `packages/web/index.html`
- Create: `packages/web/src/main.tsx`
- Create: `packages/web/src/App.tsx`
- Create: `packages/web/src/index.css` (Tailwind directives)
- Modify: root `package.json` (add workspace)

**Steps:**
1. Create `packages/web/` directory
2. Create `package.json` with React 19, Vite 6, Tailwind CSS 4, React Router 7, react-syntax-highlighter, react-markdown as dependencies
3. Create `vite.config.ts` with React plugin and API proxy to localhost:3000
4. Create `tsconfig.json` extending Vite's React preset
5. Create `index.html` entry point
6. Create `src/main.tsx` mounting React app
7. Create `src/App.tsx` with placeholder
8. Create `src/index.css` with Tailwind v4 import
9. Update root `package.json` to add `packages/web` to workspaces and build script
10. Run `npm install` and verify `npm run dev -w packages/web` starts

---

### Task 2: API client module

**Files:**
- Create: `packages/web/src/api.ts`

**Steps:**
1. Create typed fetch wrapper with functions:
   - `listAgents(limit?, offset?)` → paginated agent list
   - `searchAgents(q?, tags?, limit?, offset?)` → search results
   - `getAgent(scope, name, version?)` → agent detail with definition
   - `getVersions(scope, name)` → version list
2. Types mirror the registry API response shapes
3. Base URL configurable (defaults to `window.location.origin`)

---

### Task 3: Layout and routing

**Files:**
- Create: `packages/web/src/components/Layout.tsx`
- Modify: `packages/web/src/App.tsx`

**Steps:**
1. Create Layout component with:
   - Header: "automagent" logo/text on left, search input on right
   - Search input navigates to `/?q=searchterm` on enter
   - Main content area with `<Outlet />`
   - Footer with link to docs/GitHub
2. Set up React Router in App.tsx with routes:
   - `/` → HomePage
   - `/:scope/:name` → AgentDetailPage
   - `/:scope/:name/versions` → VersionsPage
3. Layout wraps all routes

---

### Task 4: HomePage — Agent listing with search and tags

**Files:**
- Create: `packages/web/src/pages/HomePage.tsx`
- Create: `packages/web/src/components/AgentCard.tsx`
- Create: `packages/web/src/components/SearchBar.tsx`

**Steps:**
1. HomePage reads `q` and `tags` from URL search params
2. Fetches agents using `searchAgents()` or `listAgents()` based on params
3. Renders a grid of AgentCard components
4. AgentCard shows: `@scope/name`, description (truncated), latest version badge, updated date
5. Cards link to `/:scope/:name`
6. SearchBar component with debounced input (300ms), updates URL params
7. Pagination controls at bottom (prev/next)
8. Empty state when no agents found
9. Loading skeleton while fetching

---

### Task 5: AgentDetailPage

**Files:**
- Create: `packages/web/src/pages/AgentDetailPage.tsx`
- Create: `packages/web/src/components/DefinitionViewer.tsx`
- Create: `packages/web/src/components/ReadmeViewer.tsx`

**Steps:**
1. AgentDetailPage reads `:scope` and `:name` from route params
2. Fetches agent detail via `getAgent(scope, name, version?)`
3. Reads optional `?version=` query param for version selection
4. AgentHeader: displays `@scope/name`, description, version badge
5. Version dropdown: fetches version list, selecting a version updates `?version=` param and re-fetches
6. DefinitionViewer: converts definition JSON to YAML string, renders with syntax highlighting (react-syntax-highlighter with a dark theme)
7. ReadmeViewer: renders readme markdown with react-markdown (if readme exists)
8. Tabbed interface: "Definition" tab (default) and "Readme" tab
9. "View all versions" link to `/:scope/:name/versions`
10. Copy-to-clipboard button on definition YAML
11. Install command display: `automagent pull @scope/name:version`

---

### Task 6: VersionsPage

**Files:**
- Create: `packages/web/src/pages/VersionsPage.tsx`

**Steps:**
1. Reads `:scope` and `:name` from route params
2. Fetches version list via `getVersions(scope, name)`
3. Renders a table with columns: version, published date
4. Each version row links to `/:scope/:name?version=x.y.z`
5. Back link to agent detail page
6. Loading and empty states

---

### Task 7: Registry static file serving

**Files:**
- Modify: `packages/registry/src/app.ts`
- Modify: `packages/registry/package.json` (add @hono/node-server serve-static if not present)

**Steps:**
1. Add static file serving to app.ts AFTER API routes
2. Serve files from resolved path to `packages/web/dist`
3. SPA fallback: serve `index.html` for non-API, non-file routes
4. Verify: build web package, start registry, browse to localhost:3000 shows the UI
5. Add CORS middleware for development (Vite dev server on different port)

---

### Task 8: Integration testing and polish

**Steps:**
1. Verify full flow: registry running + web UI loads agent list
2. Verify search works end-to-end
3. Verify agent detail page renders definition YAML and readme
4. Verify version switching works
5. Add `packages/web` CLAUDE.md with dev instructions
6. Update root README.md with web UI section
7. Final build check: `npm run build` from root succeeds
