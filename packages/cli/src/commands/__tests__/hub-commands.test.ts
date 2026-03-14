import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CLI_PATH } from './test-helpers.js';

const CLI_NODE_MODULES = join(import.meta.dirname, '..', '..', '..', 'node_modules');

/**
 * Run the CLI as a child process, returning a promise so the parent event loop
 * stays active (required for the local HTTP server to serve requests).
 */
function runCli(args: string, cwd: string): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve) => {
    execFile(
      'node',
      [CLI_PATH, ...args.split(/\s+/)],
      {
        cwd,
        encoding: 'utf-8',
        env: {
          ...process.env,
          FORCE_COLOR: '0',
          NO_COLOR: '1',
          NODE_PATH: CLI_NODE_MODULES,
        },
        timeout: 15_000,
      },
      (err, stdout, stderr) => {
        const output = (stdout ?? '') + (stderr ?? '');
        // execFile passes the exit code through the error object
        const exitCode = err && 'code' in err && typeof err.code === 'number'
          ? err.code
          : err ? 1 : 0;
        resolve({ stdout: output, exitCode });
      },
    );
  });
}

/** Minimal valid agent.yaml content that passes schema validation. */
const VALID_AGENT_YAML = [
  'name: test-agent',
  'description: A test agent',
  'model: gpt-4',
  'instructions: You are a test agent.',
].join('\n');

/** The agent definition object matching VALID_AGENT_YAML. */
const VALID_AGENT_DEF = {
  name: 'test-agent',
  description: 'A test agent',
  model: 'gpt-4',
  instructions: 'You are a test agent.',
};

// ---------------------------------------------------------------------------
// Shared mock HTTP server
// ---------------------------------------------------------------------------

type RouteHandler = (req: IncomingMessage, body: string) => { status: number; json: unknown };

let server: Server;
let hubUrl: string;
let routeHandler: RouteHandler;

/**
 * Set the handler that the mock server will use for the next request(s).
 * The handler receives the request and its body, and returns status + JSON response.
 */
function setRoute(handler: RouteHandler): void {
  routeHandler = handler;
}

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const result = routeHandler(req, body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.json));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Test server error' }));
      }
    });
  });

  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as { port: number };
  hubUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
  server.close();
});

// ---------------------------------------------------------------------------
// Push command
// ---------------------------------------------------------------------------
describe('push command (hub integration)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'hub-push-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('successful push (200) exits 0 and shows success message', async () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), VALID_AGENT_YAML);

    setRoute((req, body) => {
      expect(req.method).toBe('PUT');
      expect(req.url).toContain('/v1/agents/');
      const parsed = JSON.parse(body);
      expect(parsed.definition.name).toBe('test-agent');
      return { status: 200, json: { ok: true } };
    });

    const { exitCode, stdout } = await runCli(`push --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Pushed/i);
    expect(stdout).toContain('test-agent');
  });

  it('hub returns 403 — exits 1 and shows error', async () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), VALID_AGENT_YAML);

    setRoute(() => {
      return { status: 403, json: { error: 'Forbidden: insufficient permissions' } };
    });

    const { exitCode, stdout } = await runCli(`push --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/403/);
  });

  it('invalid agent.yaml exits 1 before making a request', async () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'description: no name or model\n');

    let requestMade = false;
    setRoute(() => {
      requestMade = true;
      return { status: 200, json: { ok: true } };
    });

    const { exitCode, stdout } = await runCli(`push --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(1);
    expect(requestMade).toBe(false);
    expect(stdout).toMatch(/invalid/i);
  });
});

// ---------------------------------------------------------------------------
// Pull command
// ---------------------------------------------------------------------------
describe('pull command (hub integration)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'hub-pull-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('successful pull (200) exits 0 and writes agent.yaml', async () => {
    setRoute((req) => {
      expect(req.method).toBe('GET');
      expect(req.url).toContain('/v1/agents/');
      return {
        status: 200,
        json: {
          definition: VALID_AGENT_DEF,
          version: '1.0.0',
        },
      };
    });

    const { exitCode, stdout } = await runCli(
      `pull @acme/test-agent --hub-url ${hubUrl} -o agent.yaml`,
      tmpDir,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Pulled/i);

    const written = readFileSync(join(tmpDir, 'agent.yaml'), 'utf-8');
    expect(written).toContain('test-agent');
    expect(written).toContain('gpt-4');
  });

  it('agent not found (404) exits 1 and shows "not found"', async () => {
    setRoute(() => {
      return { status: 404, json: { error: 'Not found' } };
    });

    const { exitCode, stdout } = await runCli(
      `pull @acme/missing-agent --hub-url ${hubUrl} -o agent.yaml`,
      tmpDir,
    );
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/not found/i);
  });

  it('--force overwrites existing file', async () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), 'old content');

    setRoute(() => {
      return {
        status: 200,
        json: {
          definition: VALID_AGENT_DEF,
          version: '2.0.0',
        },
      };
    });

    const { exitCode, stdout } = await runCli(
      `pull @acme/test-agent --hub-url ${hubUrl} --force -o agent.yaml`,
      tmpDir,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/Pulled/i);

    const content = readFileSync(join(tmpDir, 'agent.yaml'), 'utf-8');
    expect(content).not.toContain('old content');
    expect(content).toContain('test-agent');
  });
});

// ---------------------------------------------------------------------------
// Search command
// ---------------------------------------------------------------------------
describe('search command (hub integration)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'hub-search-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('successful search with results exits 0 and shows agent names', async () => {
    setRoute((req) => {
      expect(req.method).toBe('GET');
      expect(req.url).toContain('/v1/search');
      return {
        status: 200,
        json: {
          agents: [
            {
              name: 'data-analyst',
              scope: '@acme',
              description: 'Analyzes data sets',
              latestVersion: '1.2.0',
              updatedAt: '2025-01-01T00:00:00Z',
            },
            {
              name: 'code-reviewer',
              scope: '@acme',
              description: 'Reviews pull requests',
              latestVersion: '0.5.0',
              updatedAt: '2025-01-02T00:00:00Z',
            },
          ],
          total: 2,
        },
      };
    });

    const { exitCode, stdout } = await runCli(`search analyst --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('data-analyst');
    expect(stdout).toContain('code-reviewer');
    expect(stdout).toContain('2');
  });

  it('empty results exits 0 and shows "No agents found"', async () => {
    setRoute(() => {
      return {
        status: 200,
        json: { agents: [], total: 0 },
      };
    });

    const { exitCode, stdout } = await runCli(`search nonexistent --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/no agents found/i);
  });
});

// ---------------------------------------------------------------------------
// Diff command
// ---------------------------------------------------------------------------
describe('diff command (hub integration)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'hub-diff-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('no differences exits 0 and shows "No differences"', async () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), VALID_AGENT_YAML);

    setRoute(() => {
      return {
        status: 200,
        json: {
          definition: VALID_AGENT_DEF,
          version: '1.0.0',
        },
      };
    });

    const { exitCode, stdout } = await runCli(
      `diff --hub-url ${hubUrl} --scope @acme`,
      tmpDir,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/no differences/i);
  });

  it('has differences exits 0 and shows diff output', async () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), VALID_AGENT_YAML);

    const remoteDef = {
      ...VALID_AGENT_DEF,
      instructions: 'You are a DIFFERENT agent.',
    };

    setRoute(() => {
      return {
        status: 200,
        json: { definition: remoteDef, version: '0.9.0' },
      };
    });

    const { exitCode, stdout } = await runCli(
      `diff --hub-url ${hubUrl} --scope @acme`,
      tmpDir,
    );
    expect(exitCode).toBe(0);
    // The diff output should contain both the old and new instruction lines
    expect(stdout).toContain('DIFFERENT');
    expect(stdout).toContain('test agent');
  });

  it('agent not found (404) exits 0 and shows "not found in hub"', async () => {
    writeFileSync(join(tmpDir, 'agent.yaml'), VALID_AGENT_YAML);

    setRoute(() => {
      return { status: 404, json: { error: 'Not found' } };
    });

    const { exitCode, stdout } = await runCli(
      `diff --hub-url ${hubUrl} --scope @acme`,
      tmpDir,
    );
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/not found in hub/i);
  });

  it('missing --scope and no scope in yaml exits 1', async () => {
    // agent.yaml has no scope field
    writeFileSync(join(tmpDir, 'agent.yaml'), VALID_AGENT_YAML);

    let requestMade = false;
    setRoute(() => {
      requestMade = true;
      return { status: 200, json: {} };
    });

    const { exitCode, stdout } = await runCli(`diff --hub-url ${hubUrl}`, tmpDir);
    expect(exitCode).toBe(1);
    expect(stdout).toMatch(/scope/i);
    expect(requestMade).toBe(false);
  });
});
