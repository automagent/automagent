import type { Command } from 'commander';
import chalk from 'chalk';
import { error, info, heading } from '../utils/output.js';
import { getAuthHeaders } from '../utils/credentials.js';

const DEFAULT_HUB = 'https://hub.automagent.dev';

interface SearchResult {
  agents: Array<{
    name: string;
    scope: string;
    description: string;
    latestVersion: string;
    updatedAt: string;
  }>;
  total: number;
}

export function searchCommand(program: Command): void {
  program
    .command('search')
    .description('Search the hub for agents')
    .argument('[query]', 'Search query')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .action(async (query: string | undefined, opts: { tags?: string; hubUrl: string }) => {
      heading('Searching hub');

      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (opts.tags) params.set('tags', opts.tags);

      const url = `${opts.hubUrl}/v1/search?${params}`;

      try {
        const res = await fetch(url, {
          headers: { ...getAuthHeaders() },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          error(`Hub returned ${res.status}: ${(body as Record<string, string>).error ?? res.statusText}`);
          process.exitCode = 1;
          return;
        }

        const body = (await res.json()) as SearchResult;

        if (body.agents.length === 0) {
          info('No agents found.');
          return;
        }

        console.log(chalk.dim(`Found ${body.total} agent(s):\n`));

        for (const agent of body.agents) {
          console.log(
            chalk.bold(`${agent.scope}/${agent.name}`) +
              chalk.dim(`@${agent.latestVersion}`),
          );
          console.log(`  ${agent.description}`);
          console.log();
        }
      } catch {
        error(`Failed to connect to hub at ${opts.hubUrl}`);
        info('Is the hub running? Start it with: docker compose up');
        process.exitCode = 1;
      }
    });
}
