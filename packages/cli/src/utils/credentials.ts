import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface Credentials {
  token: string;
  username: string;
  hubUrl: string;
}

function defaultDir(): string {
  return join(homedir(), '.automagent');
}

function credPath(dir: string): string {
  return join(dir, 'credentials.json');
}

export function saveCredentials(creds: Credentials, dir: string = defaultDir()): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(credPath(dir), JSON.stringify(creds, null, 2), { mode: 0o600 });
}

export function loadCredentials(dir: string = defaultDir()): Credentials | null {
  const p = credPath(dir);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

export function clearCredentials(dir: string = defaultDir()): void {
  const p = credPath(dir);
  if (existsSync(p)) {
    unlinkSync(p);
  }
}

export function getAuthHeaders(): Record<string, string> {
  const creds = loadCredentials();
  if (!creds?.token) return {};
  return { Authorization: `Bearer ${creds.token}` };
}
