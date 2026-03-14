import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

export const CLI_PATH = join(import.meta.dirname, '..', '..', '..', 'dist', 'index.js');

export function runCli(
  args: string,
  cwd: string,
  env?: Record<string, string>,
): { stdout: string; exitCode: number } {
  const result = spawnSync('node', [CLI_PATH, ...args.split(/\s+/)], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', ...env },
    timeout: 10_000,
  });
  return {
    stdout: (result.stdout ?? '') + (result.stderr ?? ''),
    exitCode: result.status ?? 1,
  };
}
