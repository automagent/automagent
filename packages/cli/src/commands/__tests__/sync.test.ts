import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI_PATH = join(import.meta.dirname, '..', '..', '..', 'dist', 'index.js');

function runCli(args: string, cwd: string): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${CLI_PATH} ${args}`, {
      cwd,
      encoding: 'utf-8',
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
      timeout: 10_000,
    });
    return { stdout, exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (e.stdout ?? '') + (e.stderr ?? ''),
      exitCode: e.status ?? 1,
    };
  }
}

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
