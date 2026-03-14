import { describe, it, expect, afterEach, vi } from 'vitest';
import { existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { saveCredentials, loadCredentials, clearCredentials, getAuthHeaders, checkHubSecurity, warnIfInsecure } from '../../utils/credentials.js';

// Mock node:os so we can control homedir() for getAuthHeaders tests.
// All other exports (tmpdir, etc.) are passed through from the real module.
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: vi.fn(actual.homedir),
  };
});

const testDir = join(tmpdir(), 'automagent-test-' + Date.now());

describe('credentials', () => {
  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('saves and loads credentials', () => {
    saveCredentials({ token: 'abc123', username: 'testuser', hubUrl: 'http://localhost:3000' }, testDir);
    const creds = loadCredentials(testDir);
    expect(creds).toEqual({ token: 'abc123', username: 'testuser', hubUrl: 'http://localhost:3000' });
  });

  it('returns null when no credentials exist', () => {
    const creds = loadCredentials(testDir);
    expect(creds).toBeNull();
  });

  it('clears credentials', () => {
    saveCredentials({ token: 'abc123', username: 'testuser', hubUrl: 'http://localhost:3000' }, testDir);
    clearCredentials(testDir);
    expect(loadCredentials(testDir)).toBeNull();
  });

  it('saves credentials with restricted file permissions', () => {
    saveCredentials({ token: 'abc123', username: 'testuser', hubUrl: 'http://localhost:3000' }, testDir);
    const filePath = join(testDir, 'credentials.json');
    const stats = statSync(filePath);
    // File should be owner read/write only (0o600)
    expect(stats.mode & 0o777).toBe(0o600);
  });

  it('creates credentials directory with restricted permissions', () => {
    const newDir = join(tmpdir(), 'automagent-perms-test-' + Date.now());
    try {
      saveCredentials({ token: 'abc123', username: 'testuser', hubUrl: 'http://localhost:3000' }, newDir);
      const stats = statSync(newDir);
      // Directory should be owner rwx only (0o700)
      expect(stats.mode & 0o777).toBe(0o700);
    } finally {
      if (existsSync(newDir)) {
        rmSync(newDir, { recursive: true });
      }
    }
  });
});

describe('getAuthHeaders', () => {
  let fakeHome: string;
  const homedirMock = vi.mocked(homedir);

  afterEach(() => {
    homedirMock.mockReset();
    if (fakeHome && existsSync(fakeHome)) {
      rmSync(fakeHome, { recursive: true });
    }
  });

  it('returns Authorization header when credentials exist', () => {
    fakeHome = join(tmpdir(), 'automagent-auth-test-' + Date.now());
    homedirMock.mockReturnValue(fakeHome);
    const credsDir = join(fakeHome, '.automagent');
    saveCredentials({ token: 'test-token-123', username: 'testuser', hubUrl: 'http://localhost:3000' }, credsDir);

    const headers = getAuthHeaders();
    expect(headers).toEqual({ Authorization: 'Bearer test-token-123' });
  });

  it('returns empty object when no credentials exist', () => {
    fakeHome = join(tmpdir(), 'automagent-auth-test-' + Date.now());
    homedirMock.mockReturnValue(fakeHome);

    const headers = getAuthHeaders();
    expect(headers).toEqual({});
  });

  it('returns empty object when token is empty string', () => {
    fakeHome = join(tmpdir(), 'automagent-auth-test-' + Date.now());
    homedirMock.mockReturnValue(fakeHome);
    const credsDir = join(fakeHome, '.automagent');
    saveCredentials({ token: '', username: 'testuser', hubUrl: 'http://localhost:3000' }, credsDir);

    const headers = getAuthHeaders();
    expect(headers).toEqual({});
  });
});

describe('credentials expiration', () => {
  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('returns credentials when expiresAt is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    saveCredentials({ token: 'abc123', username: 'testuser', hubUrl: 'http://localhost:3000', expiresAt: future }, testDir);
    const creds = loadCredentials(testDir);
    expect(creds).not.toBeNull();
    expect(creds!.token).toBe('abc123');
  });

  it('returns null and warns when expiresAt is in the past', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    saveCredentials({ token: 'abc123', username: 'testuser', hubUrl: 'http://localhost:3000', expiresAt: past }, testDir);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const creds = loadCredentials(testDir);
    expect(creds).toBeNull();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Credentials have expired'));
    spy.mockRestore();
  });

  it('returns credentials when expiresAt is not set (backward compat)', () => {
    saveCredentials({ token: 'abc123', username: 'testuser', hubUrl: 'http://localhost:3000' }, testDir);
    const creds = loadCredentials(testDir);
    expect(creds).not.toBeNull();
    expect(creds!.token).toBe('abc123');
  });
});

describe('checkHubSecurity', () => {
  it('returns true for HTTPS URLs', () => {
    expect(checkHubSecurity('https://hub.automagent.dev')).toBe(true);
  });

  it('returns true for localhost HTTP URLs', () => {
    expect(checkHubSecurity('http://localhost:3000')).toBe(true);
  });

  it('returns true for 127.0.0.1 HTTP URLs', () => {
    expect(checkHubSecurity('http://127.0.0.1:3000')).toBe(true);
  });

  it('returns false for non-localhost HTTP without allowInsecure', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(checkHubSecurity('http://example.com')).toBe(false);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Refusing to send credentials over insecure HTTP'));
    spy.mockRestore();
  });

  it('returns true for non-localhost HTTP with allowInsecure', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(checkHubSecurity('http://example.com', true)).toBe(true);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Using insecure HTTP'));
    spy.mockRestore();
  });

  it('deprecated warnIfInsecure still works', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnIfInsecure('http://example.com');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Using insecure HTTP'));
    spy.mockRestore();
  });
});
