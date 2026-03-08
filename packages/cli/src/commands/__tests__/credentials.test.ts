import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { saveCredentials, loadCredentials, clearCredentials } from '../../utils/credentials.js';

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
});
