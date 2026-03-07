import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: [
        'packages/schema/src/**/*.ts',
        'packages/cli/src/**/*.ts',
      ],
      exclude: [
        '**/__tests__/**',
        '**/dist/**',
        '**/*.d.ts',
      ],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
    },
    reporters: ['default', 'json'],
    outputFile: './test-report.json',
  },
});
