import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runCli } from './test-helpers.js';

describe('sync command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'automagent-sync-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('syncs to all targets by default', () => {
    writeFileSync(join(tempDir, 'agent.yaml'), [
      'name: test-agent',
      'description: A test agent',
      'model: claude-sonnet-4-20250514',
      'instructions: Be helpful.',
    ].join('\n'));

    runCli('sync --force', tempDir);

    expect(existsSync(join(tempDir, '.claude-plugin', 'plugin.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursor', 'rules', 'test-agent.mdc'))).toBe(true);
    expect(existsSync(join(tempDir, '.github', 'copilot-instructions.md'))).toBe(true);
  });

  it('syncs to specific targets with --target', () => {
    writeFileSync(join(tempDir, 'agent.yaml'), [
      'name: test-agent',
      'description: A test agent',
      'model: claude-sonnet-4-20250514',
      'instructions: Be helpful.',
    ].join('\n'));

    runCli('sync --target claude-code --force', tempDir);

    expect(existsSync(join(tempDir, '.claude-plugin', 'plugin.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursor', 'rules', 'test-agent.mdc'))).toBe(false);
  });

  it('shows dry-run output without writing', () => {
    writeFileSync(join(tempDir, 'agent.yaml'), [
      'name: test-agent',
      'description: A test agent',
      'model: claude-sonnet-4-20250514',
      'instructions: Be helpful.',
    ].join('\n'));

    const { stdout } = runCli('sync --dry-run', tempDir);

    expect(stdout).toContain('plugin.json');
    expect(existsSync(join(tempDir, '.claude-plugin', 'plugin.json'))).toBe(false);
  });
});
