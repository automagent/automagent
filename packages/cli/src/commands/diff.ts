import { resolve } from 'node:path';
import type { Command } from 'commander';
import { stringify } from 'yaml';
import chalk from 'chalk';
import { parseYamlFile } from '../utils/yaml.js';
import { error, info, heading } from '../utils/output.js';
import { checkHubSecurity } from '../utils/credentials.js';
import { DEFAULT_HUB, YAML_STRINGIFY_OPTIONS } from '../utils/constants.js';
import { HubClient } from '../utils/hub-client.js';

function diffLines(localLines: string[], remoteLines: string[]): string[] {
  const output: string[] = [];
  const localSet = new Set(localLines);
  const remoteSet = new Set(remoteLines);

  let i = 0;
  let j = 0;

  while (i < localLines.length || j < remoteLines.length) {
    const localLine = i < localLines.length ? localLines[i] : undefined;
    const remoteLine = j < remoteLines.length ? remoteLines[j] : undefined;

    if (localLine === remoteLine) {
      output.push(`  ${localLine}`);
      i++;
      j++;
    } else if (remoteLine !== undefined && !localSet.has(remoteLine)) {
      output.push(chalk.red(`- ${remoteLine}`));
      j++;
    } else if (localLine !== undefined && !remoteSet.has(localLine)) {
      output.push(chalk.green(`+ ${localLine}`));
      i++;
    } else {
      if (remoteLine !== undefined) {
        output.push(chalk.red(`- ${remoteLine}`));
        j++;
      }
      if (localLine !== undefined) {
        output.push(chalk.green(`+ ${localLine}`));
        i++;
      }
    }
  }

  return output;
}

export function diffCommand(program: Command): void {
  program
    .command('diff')
    .description('Compare local agent definition with published version')
    .argument('[path]', 'Path to agent.yaml', './agent.yaml')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .option('--scope <scope>', 'Agent scope (e.g. @acme)')
    .option('--version <version>', 'Compare against specific version')
    .option('--insecure', 'Allow insecure HTTP connections')
    .action(async (path: string, opts: { hubUrl: string; scope?: string; version?: string; insecure?: boolean }) => {
      const filePath = resolve(path);

      if (!checkHubSecurity(opts.hubUrl, opts.insecure)) {
        process.exitCode = 1;
        return;
      }
      heading('Comparing with hub');

      const parsed = parseYamlFile(filePath);
      if (parsed.error || !parsed.data) {
        error(parsed.error ?? `Cannot read ${path}`);
        process.exitCode = 1;
        return;
      }
      const localDef = parsed.data as Record<string, unknown>;

      const name = localDef.name as string | undefined;
      if (!name) {
        error('Local agent.yaml has no name field');
        process.exitCode = 1;
        return;
      }

      const scope = opts.scope ?? (localDef.scope as string | undefined);
      if (!scope) {
        error('No scope provided. Use --scope or add scope to agent.yaml');
        process.exitCode = 1;
        return;
      }

      const client = new HubClient(opts.hubUrl);

      let remoteDef: Record<string, unknown>;
      let remoteVersion: string;
      try {
        const agentPath = `/agents/${encodeURIComponent(scope)}/${encodeURIComponent(name)}${opts.version ? `?version=${encodeURIComponent(opts.version)}` : ''}`;
        const res = await client.request<{ definition: Record<string, unknown>; version: string }>(agentPath);

        if (res.status === 404) {
          info(`Agent ${scope}/${name} not found in hub. Nothing to compare.`);
          return;
        }

        if (!res.ok) {
          error(`Hub returned ${res.status}: ${res.error ?? 'Unknown error'}`);
          process.exitCode = 1;
          return;
        }

        remoteDef = res.data!.definition;
        remoteVersion = res.data!.version;
      } catch (err) {
        HubClient.handleError(err);
        return;
      }

      const yamlOpts = { ...YAML_STRINGIFY_OPTIONS, sortMapEntries: true };
      const localYaml = stringify(localDef, yamlOpts).trimEnd();
      const remoteYaml = stringify(remoteDef, yamlOpts).trimEnd();

      if (localYaml === remoteYaml) {
        console.log(chalk.green(`\n  No differences — local matches ${scope}/${name}@${remoteVersion}\n`));
        return;
      }

      const localLines = localYaml.split('\n');
      const remoteLines = remoteYaml.split('\n');

      console.log(chalk.bold(`\n  ${scope}/${name}@${remoteVersion} (hub) → local\n`));
      const diff = diffLines(localLines, remoteLines);
      for (const line of diff) {
        console.log(`  ${line}`);
      }
      console.log();
    });
}
