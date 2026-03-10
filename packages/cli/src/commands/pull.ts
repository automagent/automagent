import { resolve } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { stringify } from 'yaml';
import { success, error, info, heading } from '../utils/output.js';
import { getAuthHeaders } from '../utils/credentials.js';
import { SCHEMA_HEADER, DEFAULT_HUB } from '../utils/constants.js';

export function parseAgentRef(ref: string): { scope: string; name: string; version?: string } {
  // Scoped: @scope/name, @scope/name:version, @scope/name@version
  const scopedMatch = ref.match(/^(@[^/]+)\/([^@:]+)(?:[@:](.+))?$/);
  if (scopedMatch) {
    return { scope: scopedMatch[1], name: scopedMatch[2], version: scopedMatch[3] };
  }

  // Unscoped: name, name:version, name@version → maps to _ scope (official/unscoped)
  const unscopedMatch = ref.match(/^([a-zA-Z0-9][a-zA-Z0-9_-]*)(?:[@:](.+))?$/);
  if (unscopedMatch) {
    return { scope: '_', name: unscopedMatch[1], version: unscopedMatch[2] };
  }

  throw new Error(`Invalid agent reference: "${ref}". Expected format: @scope/name or name (with optional @version or :version)`);
}

export function pullCommand(program: Command): void {
  program
    .command('pull')
    .description('Pull agent definition from the hub')
    .argument('<ref>', 'Agent reference (e.g. @acme/my-agent:1.0.0, my-agent@0.1.0, or my-agent)')
    .option('-o, --output <path>', 'Output file path', './agent.yaml')
    .option('--hub-url <url>', 'Hub URL', DEFAULT_HUB)
    .option('--force', 'Overwrite existing file')
    .action(async (ref: string, opts: { output: string; hubUrl: string; force?: boolean }) => {
      const outputPath = resolve(opts.output);

      heading('Pulling from hub');

      if (existsSync(outputPath) && !opts.force) {
        error(`${opts.output} already exists. Use --force to overwrite.`);
        process.exitCode = 1;
        return;
      }

      let parsed;
      try {
        parsed = parseAgentRef(ref);
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
      }

      const url = `${opts.hubUrl}/v1/agents/${encodeURIComponent(parsed.scope)}/${encodeURIComponent(parsed.name)}${parsed.version ? `?version=${parsed.version}` : ''}`;

      try {
        const res = await fetch(url, {
          headers: { ...getAuthHeaders() },
        });

        if (res.status === 404) {
          error(`Agent not found: ${ref}`);
          process.exitCode = 1;
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          error(`Hub returned ${res.status}: ${(body as Record<string, string>).error ?? res.statusText}`);
          process.exitCode = 1;
          return;
        }

        const body = await res.json() as { definition: Record<string, unknown>; version: string };
        const yamlContent = `${SCHEMA_HEADER}\n${stringify(body.definition, { lineWidth: 120 })}`;

        writeFileSync(outputPath, yamlContent, 'utf-8');
        success(`Pulled ${parsed.scope}/${parsed.name}@${body.version} to ${opts.output}`);
      } catch {
        error(`Failed to connect to hub at ${opts.hubUrl}`);
        info('Is the hub running? Start it with: docker compose up');
        process.exitCode = 1;
      }
    });
}
