import { resolve } from 'node:path';
import type { Command } from 'commander';
import { validate } from '@automagent/schema';
import { parseYamlFile } from '../utils/yaml.js';
import chalk from 'chalk';
import { success, error, info, heading } from '../utils/output.js';
import { getAuthHeaders, loadCredentials, warnIfInsecure } from '../utils/credentials.js';
import { DEFAULT_HUB } from '../utils/constants.js';

export function pushCommand(program: Command): void {
  program
    .command('push')
    .description('Push agent definition to the hub')
    .argument('[path]', 'Path to agent.yaml', './agent.yaml')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .option('--scope <scope>', 'Agent scope (default: @local)')
    .action(async (path: string, opts: { hubUrl: string; scope?: string }) => {
      const filePath = resolve(path);

      warnIfInsecure(opts.hubUrl);
      heading('Pushing to hub');

      const { data, error: parseError } = parseYamlFile(filePath);
      if (parseError) {
        error(parseError);
        process.exitCode = 1;
        return;
      }

      if (!data || typeof data !== 'object') {
        error('agent.yaml is empty or not a valid YAML object.');
        process.exitCode = 1;
        return;
      }

      const result = validate(data);
      if (!result.valid) {
        error('Invalid agent definition:');
        for (const e of result.errors) {
          error(`  ${e.instancePath || '/'}: ${e.message ?? 'validation error'}`);
        }
        process.exitCode = 1;
        return;
      }

      const def = data as Record<string, unknown>;
      const name = String(def.name);
      const version = String(def.version ?? '0.1.0');
      const scope = opts.scope ?? '@local';
      const tags = (def.metadata as Record<string, unknown> | undefined)?.tags as string[] | undefined;

      const url = `${opts.hubUrl}/v1/agents/${encodeURIComponent(scope)}/${encodeURIComponent(name)}`;

      const creds = loadCredentials();
      if (!creds) {
        console.log(chalk.yellow('Warning: Not logged in. Push will fail if the hub requires authentication.'));
        console.log(chalk.yellow('Run `automagent login` to authenticate.\n'));
      }

      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(opts.hubUrl),
          },
          body: JSON.stringify({ version, definition: def, tags }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          error(`Hub returned ${res.status}: ${(body as Record<string, string>).error ?? res.statusText}`);
          process.exitCode = 1;
          return;
        }

        success(`Pushed ${scope}/${name}@${version} to ${opts.hubUrl}`);
      } catch (err) {
        const hint = opts.hubUrl === DEFAULT_HUB
          ? 'Check your internet connection.'
          : `Is the hub running at ${opts.hubUrl}?`;
        error(`Failed to connect to hub: ${err instanceof Error ? err.message : String(err)}`);
        info(hint);
        process.exitCode = 1;
      }
    });
}
