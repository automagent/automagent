import type { Command } from 'commander';
import { success, error, heading } from '../utils/output.js';
import { checkHubSecurity, loadCredentials } from '../utils/credentials.js';
import { HubClient } from '../utils/hub-client.js';
import { DEFAULT_HUB } from '../utils/constants.js';
import chalk from 'chalk';

export function unpublishCommand(program: Command): void {
  program
    .command('unpublish')
    .description('Remove an agent from the hub')
    .argument('<scope>', 'Agent scope')
    .argument('<name>', 'Agent name')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .option('--insecure', 'Allow insecure HTTP connections')
    .action(async (scope: string, name: string, opts: { hubUrl: string; insecure?: boolean }) => {
      if (!checkHubSecurity(opts.hubUrl, opts.insecure)) {
        process.exitCode = 1;
        return;
      }

      const creds = loadCredentials();
      if (!creds) {
        error('Not logged in. Run `automagent login` to authenticate.');
        process.exitCode = 1;
        return;
      }

      heading('Unpublishing agent');

      const client = new HubClient(opts.hubUrl);
      try {
        const res = await client.request(`/agents/${encodeURIComponent(scope)}/${encodeURIComponent(name)}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          if (res.status === 404) {
            error(`Agent not found: ${scope}/${name}`);
          } else {
            error(`Hub returned ${res.status}: ${res.error ?? 'Unknown error'}`);
          }
          process.exitCode = 1;
          return;
        }

        success(`Removed ${scope}/${name} from the hub.`);
      } catch (err) {
        HubClient.handleError(err);
      }
    });
}
