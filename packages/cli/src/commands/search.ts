import type { Command } from 'commander';
import chalk from 'chalk';
import { error, info, heading } from '../utils/output.js';
import { checkHubSecurity } from '../utils/credentials.js';
import { DEFAULT_HUB } from '../utils/constants.js';
import { HubClient } from '../utils/hub-client.js';

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
    .option('--insecure', 'Allow insecure HTTP connections')
    .option('--json', 'Output raw JSON')
    .action(async (query: string | undefined, opts: { tags?: string; hubUrl: string; limit: string; page: string; insecure?: boolean; json?: boolean }) => {
      if (!checkHubSecurity(opts.hubUrl, opts.insecure)) {
        process.exitCode = 1;
        return;
      }
      heading('Searching hub');

      const limit = Math.max(1, Math.min(100, parseInt(opts.limit, 10) || 20));
      const page = Math.max(1, parseInt(opts.page, 10) || 1);
      const offset = (page - 1) * limit;

      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (opts.tags) params.set('tags', opts.tags);
      params.set('limit', String(limit));
      params.set('offset', String(offset));

      const client = new HubClient(opts.hubUrl);
      try {
        const res = await client.request<SearchResult>(`/search?${params}`);

        if (!res.ok) {
          error(`Hub returned ${res.status}: ${res.error ?? 'Unknown error'}`);
          process.exitCode = 1;
          return;
        }

        const body = res.data!;

        if (opts.json) {
          console.log(JSON.stringify(body, null, 2));
          return;
        }

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
        HubClient.handleError(err);
      }
    });
}
