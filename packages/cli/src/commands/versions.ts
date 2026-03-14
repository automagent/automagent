import type { Command } from 'commander';
import chalk from 'chalk';
import { error, heading } from '../utils/output.js';
import { checkHubSecurity } from '../utils/credentials.js';
import { HubClient } from '../utils/hub-client.js';
import { DEFAULT_HUB } from '../utils/constants.js';

interface VersionEntry {
  version: string;
  createdAt: string;
}

export function versionsCommand(program: Command): void {
  program
    .command('versions')
    .description('List published versions of an agent')
    .argument('<scope>', 'Agent scope')
    .argument('<name>', 'Agent name')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .option('--insecure', 'Allow insecure HTTP connections')
    .option('--json', 'Output raw JSON')
    .action(async (scope: string, name: string, opts: { hubUrl: string; insecure?: boolean; json?: boolean }) => {
      if (!checkHubSecurity(opts.hubUrl, opts.insecure)) {
        process.exitCode = 1;
        return;
      }
      heading(`Versions of ${scope}/${name}`);

      const client = new HubClient(opts.hubUrl);
      try {
        const res = await client.request<{ versions: VersionEntry[] }>(
          `/agents/${encodeURIComponent(scope)}/${encodeURIComponent(name)}/versions`,
        );

        if (!res.ok) {
          if (res.status === 404) {
            error(`Agent not found: ${scope}/${name}`);
          } else {
            error(`Hub returned ${res.status}: ${res.error ?? 'Unknown error'}`);
          }
          process.exitCode = 1;
          return;
        }

        const body = res.data!;

        if (opts.json) {
          console.log(JSON.stringify(body, null, 2));
          return;
        }

        const versions = body.versions;
        if (versions.length === 0) {
          console.log(chalk.dim('No versions found.'));
          return;
        }

        for (const v of versions) {
          const date = new Date(v.createdAt).toLocaleDateString();
          console.log(`  ${chalk.bold(v.version)}  ${chalk.dim(date)}`);
        }
      } catch (err) {
        HubClient.handleError(err);
      }
    });
}
