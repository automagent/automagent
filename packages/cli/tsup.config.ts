import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  noExternal: [],
  external: [
    '@anthropic-ai/sdk',
    'openai',
    'commander',
    'chalk',
    'yaml',
    'ora',
    '@automagent/schema',
  ],
});
