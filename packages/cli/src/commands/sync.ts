import { resolve, dirname, join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { validate } from '@automagent/schema';
import { parseYamlFile } from '../utils/yaml.js';
import { success, error, info, heading } from '../utils/output.js';
import { exportClaudeCode } from '../exporters/claude-code.js';
import { exportCursor } from '../exporters/cursor.js';
import { exportCopilot } from '../exporters/copilot.js';
import type { ExportTarget } from './export.js';

const ALL_TARGETS: ExportTarget[] = ['claude-code', 'cursor', 'copilot'];

export function syncCommand(program: Command): void {
  program
    .command('sync')
    .description('Sync agent.yaml to all IDE-native configuration files')
    .argument('[path]', 'Path to agent.yaml', './agent.yaml')
    .option('--target <targets>', 'Comma-separated targets (claude-code,cursor,copilot)')
    .option('--dry-run', 'Show what would be generated without writing', false)
    .option('--force', 'Overwrite existing files', false)
    .action((path: string, opts: { target?: string; dryRun: boolean; force: boolean }) => {
      const filePath = resolve(path);
      const outputDir = dirname(filePath);

      heading('Syncing agent definition');

      // Parse YAML
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

      // Validate
      const result = validate(data);
      if (!result.valid) {
        error('Invalid agent definition:');
        for (const e of result.errors) {
          error(`  ${e.instancePath || '/'}: ${e.message ?? 'validation error'}`);
        }
        process.exitCode = 1;
        return;
      }

      const agentData = data as Record<string, unknown>;

      // Determine targets
      const targets: ExportTarget[] = opts.target
        ? opts.target.split(',').map((t) => t.trim()) as ExportTarget[]
        : ALL_TARGETS;

      // Collect all files from all targets
      const allFiles: Record<string, unknown> = {};

      for (const target of targets) {
        let files: Record<string, unknown>;
        switch (target) {
          case 'claude-code':
            files = exportClaudeCode(agentData);
            // Remap plugin.json to .claude-plugin/plugin.json
            if (files['plugin.json']) {
              files['.claude-plugin/plugin.json'] = files['plugin.json'];
              delete files['plugin.json'];
            }
            break;
          case 'cursor':
            files = exportCursor(agentData);
            break;
          case 'copilot':
            files = exportCopilot(agentData);
            break;
          default:
            error(`Unknown target: ${target}`);
            process.exitCode = 1;
            continue;
        }
        Object.assign(allFiles, files);
      }

      // Write or dry-run
      for (const [relativePath, content] of Object.entries(allFiles)) {
        const fullPath = join(outputDir, relativePath);

        if (opts.dryRun) {
          info(`Would write: ${relativePath}`);
          continue;
        }

        if (existsSync(fullPath) && !opts.force) {
          error(`File exists: ${fullPath} (use --force)`);
          continue;
        }

        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        const fileContent = typeof content === 'string'
          ? content
          : JSON.stringify(content, null, 2) + '\n';

        writeFileSync(fullPath, fileContent, 'utf-8');
        success(`Written ${relativePath}`);
      }
    });
}
