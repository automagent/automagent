import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';

const CLI_PATH = join(import.meta.dirname, '..', '..', '..', 'dist', 'index.js');

/**
 * Synchronous CLI runner — used for tests that don't need the mock server.
 */
function runCliSync(args: string, cwd: string): { stdout: string; exitCode: number } {
  const result = spawnSync('node', [CLI_PATH, ...args.split(/\s+/)], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    timeout: 10_000,
  });
  return {
    stdout: (result.stdout ?? '') + (result.stderr ?? ''),
    exitCode: result.status ?? 1,
  };
}

/**
 * Async CLI runner — uses spawn so the event loop stays free for the mock
 * HTTP server to respond in the same process.
 */
function runCli(args: string, cwd: string): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args.split(/\s+/)], {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    const timer = setTimeout(() => {
      child.kill();
      resolve({ stdout: stdout + stderr, exitCode: 1 });
    }, 15_000);

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout: stdout + stderr, exitCode: code ?? 1 });
    });
  });
}

// ---------------------------------------------------------------------------
// Agent definitions used by the mock server
// ---------------------------------------------------------------------------
const SAME_DEFINITION = {
  name: 'same-agent',
  description: 'An agent for testing',
  model: 'gpt-4',
  instructions: 'You are helpful.',
};

const REMOTE_DIFFERENT_DEFINITION = {
  name: 'diff-agent',
  description: 'Remote version',
  model: 'gpt-4',
  instructions: 'Old instructions from hub.',
};

const LOCAL_DIFFERENT_DEFINITION = {
  name: 'diff-agent',
  description: 'Local version',
  model: 'gpt-4',
  instructions: 'New local instructions.',
};

// ---------------------------------------------------------------------------
// Error cases (no mock server needed — use synchronous runner)
// ---------------------------------------------------------------------------
describe('diff command — error cases', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'diff-err-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 1 when agent.yaml is missing', () => {
    const { exitCode, stdout } = runCliSync('diff', tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/not found|cannot read/i);
  });

  it('exits 1 when agent.yaml has no name field', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'description: no name\nmodel: gpt-4\n');
    const { exitCode, stdout } = runCliSync('diff --scope @test --hub-url http://localhost:9999', tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/no name/i);
  });

  it('exits 1 when --scope is missing and YAML has no scope', () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'name: my-agent\nmodel: gpt-4\n');
    const { exitCode, stdout } = runCliSync('diff --hub-url http://localhost:9999', tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/no scope/i);
  });
});

// ---------------------------------------------------------------------------
// Hub interaction tests (mock server — use async runner)
// ---------------------------------------------------------------------------
describe('diff command — hub interaction', () => {
  let server: Server;
  let hubUrl: string;
  let tmpDir: string;

  beforeAll(async () => {
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = req.url ?? '';

      // Route: agent not found
      if (url.includes('/notfound-agent')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      // Route: same agent (no differences)
      if (url.includes('/same-agent')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          definition: SAME_DEFINITION,
          version: '1.0.0',
        }));
        return;
      }

      // Route: different agent
      if (url.includes('/diff-agent')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          definition: REMOTE_DIFFERENT_DEFINITION,
          version: '2.0.0',
        }));
        return;
      }

      // Default: 500
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unexpected request' }));
    });

    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };
    hubUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'diff-hub-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 and shows "not found" for a 404 response', async () => {
    const yaml = 'name: notfound-agent\nmodel: gpt-4\ninstructions: hello\n';
    writeFileSync(join(tmpDir, 'agent.yaml'), yaml);

    const { exitCode, stdout } = await runCli(`diff --scope @test --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/not found in hub/i);
  });

  it('exits 0 and shows "No differences" when local matches remote', async () => {
    // Write the exact same definition as what the server returns
    const yaml = [
      `name: ${SAME_DEFINITION.name}`,
      `description: ${SAME_DEFINITION.description}`,
      `model: ${SAME_DEFINITION.model}`,
      `instructions: ${SAME_DEFINITION.instructions}`,
    ].join('\n') + '\n';
    writeFileSync(join(tmpDir, 'agent.yaml'), yaml);

    const { exitCode, stdout } = await runCli(`diff --scope @test --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/no differences/i);
  });

  it('exits 0 and shows diff lines when local differs from remote', async () => {
    // Write a local definition that differs from what the server returns for diff-agent
    const yaml = [
      `name: ${LOCAL_DIFFERENT_DEFINITION.name}`,
      `description: ${LOCAL_DIFFERENT_DEFINITION.description}`,
      `model: ${LOCAL_DIFFERENT_DEFINITION.model}`,
      `instructions: ${LOCAL_DIFFERENT_DEFINITION.instructions}`,
    ].join('\n') + '\n';
    writeFileSync(join(tmpDir, 'agent.yaml'), yaml);

    const { exitCode, stdout } = await runCli(`diff --scope @test --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(0);
    // Should show the version header
    expect(stdout).toMatch(/@test\/diff-agent@2\.0\.0/);
    // Should show added/removed lines (+ and - markers)
    expect(stdout).toMatch(/[+-]/);
  });

  it('exits 1 when hub is unreachable', async () => {
    const yaml = 'name: my-agent\nmodel: gpt-4\ninstructions: hello\n';
    writeFileSync(join(tmpDir, 'agent.yaml'), yaml);

    const { exitCode, stdout } = await runCli('diff --scope @test --hub-url http://127.0.0.1:1', tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/failed to connect|ECONNREFUSED|connection/i);
  });

  it('uses scope from YAML when --scope is not provided', async () => {
    const yaml = [
      `name: ${SAME_DEFINITION.name}`,
      'scope: "@test"',
      `description: ${SAME_DEFINITION.description}`,
      `model: ${SAME_DEFINITION.model}`,
      `instructions: ${SAME_DEFINITION.instructions}`,
    ].join('\n') + '\n';
    writeFileSync(join(tmpDir, 'agent.yaml'), yaml);

    const { exitCode, stdout } = await runCli(`diff --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(0);
    // Should successfully reach the hub (no "No scope" error) and show comparison
    expect(stdout).not.toMatch(/no scope/i);
    expect(stdout).toMatch(/@test\/same-agent@1\.0\.0/);
  });
});
