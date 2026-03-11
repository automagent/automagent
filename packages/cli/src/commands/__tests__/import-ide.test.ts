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

describe('import command - IDE formats', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'automagent-import-ide-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('imports a .cursorrules file', () => {
    writeFileSync(join(tempDir, '.cursorrules'), 'Always use TypeScript.');
    const { exitCode } = runCli('import .cursorrules -f cursor --force', tempDir);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, 'agent.yaml'))).toBe(true);
    const yaml = readFileSync(join(tempDir, 'agent.yaml'), 'utf-8');
    expect(yaml).toContain('Always use TypeScript');
  });

  it('imports a Cursor .mdc file', () => {
    writeFileSync(join(tempDir, 'rules.mdc'), '---\ndescription: My rules\nalwaysApply: true\n---\n\nBe helpful.');
    const { exitCode } = runCli('import rules.mdc -f cursor --force', tempDir);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, 'agent.yaml'))).toBe(true);
  });

  it('imports a copilot-instructions.md file', () => {
    writeFileSync(join(tempDir, 'copilot-instructions.md'), 'Use TypeScript strict mode.');
    const { exitCode } = runCli('import copilot-instructions.md -f copilot --force', tempDir);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, 'agent.yaml'))).toBe(true);
  });

  it('imports a CLAUDE.md file', () => {
    writeFileSync(join(tempDir, 'CLAUDE.md'), '# My Agent\n\nBe helpful and concise.');
    const { exitCode } = runCli('import CLAUDE.md -f claude-code --force', tempDir);
    expect(exitCode).toBe(0);
    expect(existsSync(join(tempDir, 'agent.yaml'))).toBe(true);
    const yaml = readFileSync(join(tempDir, 'agent.yaml'), 'utf-8');
    expect(yaml).toContain('my-agent');
  });

  it('auto-detects .cursorrules format', () => {
    writeFileSync(join(tempDir, '.cursorrules'), 'Use TypeScript.');
    const { exitCode } = runCli('import .cursorrules --force', tempDir);
    expect(exitCode).toBe(0);
  });
});
