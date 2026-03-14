import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer, type Server } from 'node:http';
import { runCli, CLI_PATH } from './test-helpers.js';

// ---------------------------------------------------------------------------
// 1. logout command
// ---------------------------------------------------------------------------
describe('logout command', () => {
  let fakeHome: string;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'auth-logout-'));
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('clears credentials when logged in — exits 0', () => {
    // Set up credentials
    const credsDir = join(fakeHome, '.automagent');
    mkdirSync(credsDir, { recursive: true });
    writeFileSync(
      join(credsDir, 'credentials.json'),
      JSON.stringify({ token: 'tok-123', username: 'testuser', hubUrl: 'https://hub.automagent.dev' }),
    );

    const { exitCode, stdout } = runCli('logout', fakeHome, { HOME: fakeHome });
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/logged out/i);
    expect(existsSync(join(credsDir, 'credentials.json'))).toBe(false);
  });

  it('is idempotent — logout when not logged in exits 0', () => {
    const { exitCode, stdout } = runCli('logout', fakeHome, { HOME: fakeHome });
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/logged out/i);
  });
});

// ---------------------------------------------------------------------------
// 2. whoami command
// ---------------------------------------------------------------------------
describe('whoami command', () => {
  let fakeHome: string;

  beforeEach(() => {
    fakeHome = mkdtempSync(join(tmpdir(), 'auth-whoami-'));
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('shows username when logged in', () => {
    const credsDir = join(fakeHome, '.automagent');
    mkdirSync(credsDir, { recursive: true });
    writeFileSync(
      join(credsDir, 'credentials.json'),
      JSON.stringify({ token: 'tok-123', username: 'alice', hubUrl: 'https://hub.automagent.dev' }),
    );

    const { exitCode, stdout } = runCli('whoami', fakeHome, { HOME: fakeHome });
    expect(exitCode).toBe(0);
    expect(stdout).toContain('alice');
  });

  it('shows "Not logged in" when no credentials exist', () => {
    const { exitCode, stdout } = runCli('whoami', fakeHome, { HOME: fakeHome });
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/not logged in/i);
  });
});

// ---------------------------------------------------------------------------
// 3. login command (integration tests using spawn + mock hub)
// ---------------------------------------------------------------------------
describe('login command', () => {
  let fakeHome: string;
  let mockHub: Server;
  let mockHubUrl: string;
  let childProc: ChildProcess | null = null;

  /**
   * Starts a minimal mock hub server that handles POST /auth/token.
   * Returns the base URL (e.g. http://127.0.0.1:PORT).
   */
  function startMockHub(): Promise<string> {
    return new Promise((resolve, reject) => {
      mockHub = createServer((req, res) => {
        if (req.method === 'POST' && req.url === '/auth/token') {
          let body = '';
          req.on('data', (chunk: Buffer) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            const parsed = JSON.parse(body) as { code?: string; code_verifier?: string };
            if (parsed.code === 'valid-code') {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ token: 'hub-token-xyz', username: 'octocat' }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'invalid_code' }));
            }
          });
          return;
        }
        // Anything else (e.g. GET /auth/github) — just 200 OK
        res.writeHead(200);
        res.end('ok');
      });

      mockHub.listen(0, '127.0.0.1', () => {
        const addr = mockHub.address();
        if (typeof addr === 'object' && addr) {
          resolve(`http://127.0.0.1:${addr.port}`);
        } else {
          reject(new Error('Failed to start mock hub'));
        }
      });
    });
  }

  /**
   * Spawns the CLI `login` command asynchronously and returns:
   * - the child process
   * - a promise that resolves with the auth URL once it appears in stdout
   * - a function to get the accumulated stdout
   */
  function spawnLogin(hubUrl: string, home: string) {
    const child = spawn('node', [CLI_PATH, 'login', '--hub-url', hubUrl], {
      cwd: home,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        NO_COLOR: '1',
        HOME: home,
        // Prevent `open` from actually opening a browser.
        // BROWSER=echo only works on Linux (xdg-open); NO_OPEN is checked by login.ts directly.
        NO_OPEN: '1',
      },
    });

    childProc = child;

    let stdout = '';

    child.stderr?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    const authUrlPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for auth URL')), 15_000);
      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        // The CLI prints the auth URL containing "cli_port=" — match it
        const match = stdout.match(/(http:\/\/127\.0\.0\.1:\d+\/auth\/github\?[^\s]+)/);
        if (match) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });
      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const getStdout = () => stdout;

    return { child, authUrlPromise, getStdout };
  }

  /**
   * Helper: wait until a condition function returns true, polling every `interval` ms,
   * giving up after `timeoutMs`.
   */
  function waitFor(conditionFn: () => boolean, timeoutMs = 5_000, interval = 100): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const check = () => {
        if (conditionFn()) {
          resolve();
        } else if (Date.now() > deadline) {
          reject(new Error('waitFor timed out'));
        } else {
          setTimeout(check, interval);
        }
      };
      check();
    });
  }

  beforeEach(async () => {
    fakeHome = mkdtempSync(join(tmpdir(), 'auth-login-'));
    mockHubUrl = await startMockHub();
  });

  afterEach(async () => {
    // Kill child process if still running
    if (childProc && !childProc.killed) {
      childProc.kill('SIGTERM');
      // Wait briefly for the process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          childProc?.kill('SIGKILL');
          resolve();
        }, 2_000);
        childProc!.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    childProc = null;

    // Close mock hub
    await new Promise<void>((resolve) => {
      mockHub.close(() => resolve());
    });

    rmSync(fakeHome, { recursive: true, force: true });
  });

  it('successful login flow — saves credentials', async () => {
    const { authUrlPromise, getStdout } = spawnLogin(mockHubUrl, fakeHome);

    // Wait for the CLI to print the auth URL
    const authUrl = await authUrlPromise;

    // Parse the auth URL to extract the callback port and state
    const url = new URL(authUrl);
    const cliPort = url.searchParams.get('cli_port')!;
    const state = url.searchParams.get('state')!;

    expect(cliPort).toBeTruthy();
    expect(state).toBeTruthy();

    // Simulate the browser callback with a valid code and correct state
    const callbackUrl = `http://127.0.0.1:${cliPort}/callback?code=valid-code&state=${state}`;
    const callbackRes = await fetch(callbackUrl);
    expect(callbackRes.status).toBe(200);
    const body = await callbackRes.text();
    expect(body).toContain('Logged in');

    // The CLI process won't exit on its own (the 120s timeout timer keeps
    // the event loop alive), so instead of awaiting exit, poll for the
    // credentials file which is written synchronously before the response.
    const credsPath = join(fakeHome, '.automagent', 'credentials.json');
    await waitFor(() => existsSync(credsPath), 5_000);

    const creds = JSON.parse(readFileSync(credsPath, 'utf-8'));
    expect(creds.token).toBe('hub-token-xyz');
    expect(creds.username).toBe('octocat');
    expect(creds.hubUrl).toBe(mockHubUrl);

    // Also verify the CLI printed the username
    await waitFor(() => getStdout().includes('octocat'), 3_000);
  }, 20_000);

  it('callback rejects wrong state — returns 400', async () => {
    const { authUrlPromise } = spawnLogin(mockHubUrl, fakeHome);

    const authUrl = await authUrlPromise;
    const url = new URL(authUrl);
    const cliPort = url.searchParams.get('cli_port')!;

    // Send a callback with a wrong state
    const callbackUrl = `http://127.0.0.1:${cliPort}/callback?code=valid-code&state=wrong-state-value`;
    const callbackRes = await fetch(callbackUrl);
    expect(callbackRes.status).toBe(400);
    const body = await callbackRes.text();
    expect(body).toContain('Invalid state');
  }, 20_000);

  it('callback rejects missing code — returns 400', async () => {
    const { authUrlPromise } = spawnLogin(mockHubUrl, fakeHome);

    const authUrl = await authUrlPromise;
    const url = new URL(authUrl);
    const cliPort = url.searchParams.get('cli_port')!;
    const state = url.searchParams.get('state')!;

    // Send a callback with correct state but no code
    const callbackUrl = `http://127.0.0.1:${cliPort}/callback?state=${state}`;
    const callbackRes = await fetch(callbackUrl);
    expect(callbackRes.status).toBe(400);
    const body = await callbackRes.text();
    expect(body).toContain('Missing authorization code');
  }, 20_000);
});
