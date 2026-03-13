import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import chalk from 'chalk';

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
    const parsed = JSON.parse(readFileSync(p, 'utf-8'));
    if (typeof parsed?.token !== 'string' || typeof parsed?.username !== 'string' || typeof parsed?.hubUrl !== 'string') {
      return null;
    }
    return parsed as Credentials;
  } catch {
    console.error(chalk.yellow('  ⚠ Credentials file is corrupted. Run "automagent login" to re-authenticate.'));
    return null;
  }
}

export function clearCredentials(dir: string = defaultDir()): void {
  const p = credPath(dir);
  if (existsSync(p)) {
    unlinkSync(p);
  }
}

export function getAuthHeaders(targetUrl?: string): Record<string, string> {
  const creds = loadCredentials();
  if (!creds?.token) return {};
  if (targetUrl && creds.hubUrl && targetUrl !== creds.hubUrl) {
    console.error(chalk.yellow('  Warning: Hub URL does not match your login. Run "automagent login --hub-url <url>" to authenticate.'));
    return {};
  }
  return { Authorization: `Bearer ${creds.token}` };
}

export function warnIfInsecure(url: string): void {
  if (url.startsWith('http://') && !url.startsWith('http://localhost')) {
    console.error(chalk.yellow('  ⚠ Using insecure HTTP. Auth tokens will be sent in cleartext.'));
  }
}
