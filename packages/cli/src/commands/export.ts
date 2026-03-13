import { resolve, dirname, join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { validate } from '@automagent/schema';
import { parseYamlFile } from '../utils/yaml.js';
import { success, error, info, heading } from '../utils/output.js';
import { exportClaudeCode } from '../exporters/claude-code.js';
import { exportCursor } from '../exporters/cursor.js';
import { exportCopilot } from '../exporters/copilot.js';

export type ExportTarget = 'claude-code' | 'cursor' | 'copilot';

const VALID_TARGETS: ExportTarget[] = ['claude-code', 'cursor', 'copilot'];

export function exportCommand(program: Command): void {
  program
    .command('export')
    .description('Export agent.yaml to IDE-native configuration files')
    .argument('[path]', 'Path to agent.yaml', './agent.yaml')
    .requiredOption('--target <target>', 'Export target (claude-code, cursor, copilot)')
    .option('-o, --output <dir>', 'Output directory', '.')
    .option('--force', 'Overwrite existing files', false)
    .action((path: string, opts: { target: string; output: string; force: boolean }) => {
      const filePath = resolve(path);
      const outputDir = resolve(opts.output);

      if (!VALID_TARGETS.includes(opts.target as ExportTarget)) {
        error(`Unknown target: ${opts.target}`);
        info(`Supported targets: ${VALID_TARGETS.join(', ')}`);
        process.exitCode = 1;
        return;
      }

      heading(`Exporting to ${opts.target}`);

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

      // Validate (but allow export even if model is missing, since exporters handle it)
      const result = validate(data);
      if (!result.valid) {
        // Check if the only error is a missing 'model' property
        const hasOnlyModelError = result.errors.length === 1 &&
          result.errors[0].instancePath === '' &&
          (result.errors[0].params['missingProperty'] === 'model' ||
           result.errors[0].message?.includes("must have required property 'model'"));

        if (!hasOnlyModelError) {
          error('Invalid agent definition:');
          for (const e of result.errors) {
            error(`  ${e.instancePath || '/'}: ${e.message ?? 'validation error'}`);
          }
          process.exitCode = 1;
          return;
        }
      }

      const agentData = data as Record<string, unknown>;

      // Run exporter
      let files: Record<string, unknown>;
      switch (opts.target as ExportTarget) {
        case 'claude-code':
          files = exportClaudeCode(agentData);
          break;
        case 'cursor':
          files = exportCursor(agentData);
          break;
        case 'copilot':
          files = exportCopilot(agentData);
          break;
      }

      // Write files
      for (const [relativePath, content] of Object.entries(files)) {
        // For claude-code, plugin.json goes inside .claude-plugin/
        const actualPath = opts.target === 'claude-code' && relativePath === 'plugin.json'
          ? join(outputDir, '.claude-plugin', 'plugin.json')
          : join(outputDir, relativePath);

        if (existsSync(actualPath) && !opts.force) {
          error(`File already exists: ${actualPath} (use --force to overwrite)`);
          continue;
        }

        const dir = dirname(actualPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }

        const fileContent = typeof content === 'string'
          ? content
          : JSON.stringify(content, null, 2) + '\n';

        writeFileSync(actualPath, fileContent, 'utf-8');
        success(`Written ${actualPath}`);
      }
    });
}
