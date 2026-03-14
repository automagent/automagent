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
    pullCount: number;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export function searchCommand(program: Command): void {
  program
    .command('search')
    .description('Search the hub for agents')
    .argument('[query]', 'Search query')
    .option('--tags <tags>', 'Filter by tags (comma-separated)')
    .option('--limit <n>', 'Results per page', '20')
    .option('--page <n>', 'Page number', '1')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .action(async (query: string | undefined, opts: { tags?: string; hubUrl: string; limit: string; page: string }) => {
      warnIfInsecure(opts.hubUrl);
      heading('Searching hub');

      const limit = Math.max(1, Math.min(100, parseInt(opts.limit, 10) || 20));
      const page = Math.max(1, parseInt(opts.page, 10) || 1);
      const offset = (page - 1) * limit;

      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (opts.tags) params.set('tags', opts.tags);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

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

        const start = offset + 1;
        const end = Math.min(offset + body.agents.length, body.total);
        if (body.total > limit) {
          console.log(chalk.dim(`Showing ${start}\u2013${end} of ${body.total} (page ${page})\n`));
        } else {
          console.log(chalk.dim(`Found ${body.total} agent(s):\n`));
        }

        for (const agent of body.agents) {
          console.log(
            chalk.bold(`${agent.scope}/${agent.name}`) +
              chalk.dim(`@${agent.latestVersion}`) +
              (agent.pullCount > 0 ? chalk.dim(` \u2193${agent.pullCount}`) : ''),
          );
          console.log(`  ${agent.description}`);
          console.log();
        }

        if (body.total > offset + body.agents.length) {
          console.log(chalk.dim(`Use --page ${page + 1} to see more results.`));
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
