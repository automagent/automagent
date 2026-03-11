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

describe('init --target', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'automagent-init-target-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('init --quick --target claude-code generates agent.yaml and exports', () => {
    const { exitCode } = runCli('init --quick --name test-agent --target claude-code', tempDir);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, 'agent.yaml'))).toBe(true);
    expect(existsSync(join(tempDir, '.claude-plugin', 'plugin.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'skills', 'test-agent', 'SKILL.md'))).toBe(true);
  });

  it('init --quick --target cursor generates .mdc file', () => {
    const { exitCode } = runCli('init --quick --name test-agent --target cursor', tempDir);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, '.cursor', 'rules', 'test-agent.mdc'))).toBe(true);
  });

  it('init --quick --target copilot generates copilot instructions', () => {
    const { exitCode } = runCli('init --quick --name test-agent --target copilot', tempDir);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, '.github', 'copilot-instructions.md'))).toBe(true);
  });

  it('init --quick --target with multiple targets', () => {
    const { exitCode } = runCli('init --quick --name test-agent --target claude-code,cursor', tempDir);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, '.claude-plugin', 'plugin.json'))).toBe(true);
    expect(existsSync(join(tempDir, '.cursor', 'rules', 'test-agent.mdc'))).toBe(true);
  });
});
