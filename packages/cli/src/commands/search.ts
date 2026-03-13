import type { Command } from 'commander';
import chalk from 'chalk';
import { error, info, heading } from '../utils/output.js';
import { getAuthHeaders, warnIfInsecure } from '../utils/credentials.js';
import { DEFAULT_HUB } from '../utils/constants.js';

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
      warnIfInsecure(opts.hubUrl);
      heading('Searching hub');

      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (opts.tags) params.set('tags', opts.tags);

      const url = `${opts.hubUrl}/v1/search?${params}`;

      try {
        const res = await fetch(url, {
          headers: { ...getAuthHeaders(opts.hubUrl) },
          signal: AbortSignal.timeout(30_000),
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
