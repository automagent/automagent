# @automagent/web

Web UI for browsing agent definitions in the [Automagent](https://github.com/automagent/automagent) registry. Built with React, Vite, and Tailwind CSS.

## Quick Start

```bash
npm run dev -w packages/web      # Vite dev server on :5173 (proxies API to :3000)
npm run build -w packages/web    # Production build
```

The registry server serves the built assets in production at `http://localhost:3000`.

## Pages

- `/` — Agent listing with search and pagination
- `/:scope/:name` — Agent detail with YAML definition and readme
- `/:scope/:name/versions` — Version history

## Development

```bash
npm run dev            # Vite dev server with hot reload
npm run build          # TypeScript check + Vite production build
npm run preview        # Preview production build locally
npm run lint           # Type-check with tsc
```

## License

Apache-2.0
