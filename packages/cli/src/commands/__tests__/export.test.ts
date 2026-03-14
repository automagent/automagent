import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runCli } from './test-helpers.js';

describe('export command', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'automagent-export-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('exports to claude-code target', () => {
    writeFileSync(join(tempDir, 'agent.yaml'), [
      'name: test-agent',
      'description: A test agent',
      'model: claude-sonnet-4-20250514',
      'instructions: Be helpful.',
    ].join('\n'));

    runCli('export --target claude-code --force', tempDir);

    expect(existsSync(join(tempDir, '.claude-plugin', 'plugin.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'skills', 'test-agent', 'SKILL.md'))).toBe(true);

    const pluginJson = JSON.parse(readFileSync(join(tempDir, '.claude-plugin', 'plugin.json'), 'utf-8'));
    expect(pluginJson.name).toBe('test-agent');
  });

  it('exports to cursor target', () => {
    writeFileSync(join(tempDir, 'agent.yaml'), [
      'name: test-agent',
      'description: A test agent',
      'instructions: Be helpful.',
    ].join('\n'));

    runCli('export --target cursor --force', tempDir);

    expect(existsSync(join(tempDir, '.cursor', 'rules', 'test-agent.mdc'))).toBe(true);
  });

  it('exports to copilot target', () => {
    writeFileSync(join(tempDir, 'agent.yaml'), [
      'name: test-agent',
      'description: A test agent',
      'instructions: Be helpful.',
    ].join('\n'));

    runCli('export --target copilot --force', tempDir);

    expect(existsSync(join(tempDir, '.github', 'copilot-instructions.md'))).toBe(true);
  });

  it('errors on unknown target', () => {
    writeFileSync(join(tempDir, 'agent.yaml'), [
      'name: test-agent',
      'description: A test agent',
    ].join('\n'));

    const { exitCode } = runCli('export --target unknown', tempDir);
    expect(exitCode).toBe(1);
  });
});
