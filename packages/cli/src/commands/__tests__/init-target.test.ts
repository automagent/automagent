import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runCli } from './test-helpers.js';

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
