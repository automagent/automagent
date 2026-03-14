import { resolve } from 'node:path';
import type { Command } from 'commander';
import { validate } from '@automagent/schema';
import { parseYamlFile } from '../utils/yaml.js';
import { success, error, warn, heading } from '../utils/output.js';
import { loadCredentials, checkHubSecurity } from '../utils/credentials.js';
import { DEFAULT_HUB } from '../utils/constants.js';
import { HubClient } from '../utils/hub-client.js';

export function pushCommand(program: Command): void {
  program
    .command('push')
    .description('Push agent definition to the hub')
    .argument('[path]', 'Path to agent.yaml', './agent.yaml')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .option('--scope <scope>', 'Agent scope (default: @local)')
    .option('--insecure', 'Allow insecure HTTP connections')
    .action(async (path: string, opts: { hubUrl: string; scope?: string; insecure?: boolean }) => {
      const filePath = resolve(path);

      if (!checkHubSecurity(opts.hubUrl, opts.insecure)) {
        process.exitCode = 1;
        return;
      }
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

      const creds = loadCredentials();
      if (!creds) {
        warn('Not logged in. Push will fail if the hub requires authentication.');
        warn('Run `automagent login` to authenticate.');
      }

      const client = new HubClient(opts.hubUrl);
      try {
        const agentPath = `/agents/${encodeURIComponent(scope)}/${encodeURIComponent(name)}`;
        const res = await client.request(agentPath, {
          method: 'PUT',
          body: { version, definition: def, tags },
        });

        if (!res.ok) {
          error(`Hub returned ${res.status}: ${res.error ?? 'Unknown error'}`);
          process.exitCode = 1;
          return;
        }

        success(`Pushed ${scope}/${name}@${version} to ${opts.hubUrl}`);
      } catch (err) {
        HubClient.handleError(err);
      }
    });
}
