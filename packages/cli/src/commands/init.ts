import { createInterface } from 'node:readline/promises';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import type { Command } from 'commander';
import { stringify } from 'yaml';
import chalk from 'chalk';
import { success, warn, error, info, heading } from '../utils/output.js';
import { SCHEMA_HEADER, YAML_STRINGIFY_OPTIONS } from '../utils/constants.js';
import { NAME_PATTERN, NAME_MAX_LENGTH } from '@automagent/schema';
import { exportClaudeCode } from '../exporters/claude-code.js';
import { exportCursor } from '../exporters/cursor.js';
import { exportCopilot } from '../exporters/copilot.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_NAME = 'my-agent';
const DEFAULT_DESCRIPTION = 'A helpful assistant';
const DEFAULT_INSTRUCTIONS = 'You are a helpful assistant.';

export interface AgentConfig {
  apiVersion: string;
  name: string;
  description: string;
  model: string;
  instructions: string;
}

export function validateName(name: string): boolean {
  return NAME_PATTERN.test(name) && name.length <= NAME_MAX_LENGTH;
}

export function buildYaml(config: AgentConfig): string {
  const yamlBody = stringify(config, YAML_STRINGIFY_OPTIONS);
  return `${SCHEMA_HEADER}\n${yamlBody}`;
}

async function promptForConfig(): Promise<AgentConfig> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    heading('Create a new agent definition');

    let name = '';
    while (!name) {
      const input = await rl.question(chalk.bold('Agent name') + chalk.gray(` (${DEFAULT_NAME}): `));
      const candidate = input.trim() || DEFAULT_NAME;
      if (validateName(candidate)) {
        name = candidate;
      } else {
        warn('Name must match pattern: lowercase letters, numbers, and hyphens (e.g. my-agent)');
      }
    }

    const descInput = await rl.question(
      chalk.bold('Description') + chalk.gray(` (${DEFAULT_DESCRIPTION}): `),
    );
    const description = descInput.trim() || DEFAULT_DESCRIPTION;

    const modelInput = await rl.question(chalk.bold('Model') + chalk.gray(` (${DEFAULT_MODEL}): `));
    const model = modelInput.trim() || DEFAULT_MODEL;

    const instrInput = await rl.question(
      chalk.bold('Instructions') + chalk.gray(' (optional, press Enter to use default): '),
    );
    const instructions = instrInput.trim() || DEFAULT_INSTRUCTIONS;

    console.log();
    return { apiVersion: 'v1', name, description, model, instructions };
  } finally {
    rl.close();
  }
}

export function buildQuickConfig(opts: {
  name?: string;
  description?: string;
  model?: string;
}): AgentConfig {
  const name = opts.name ?? DEFAULT_NAME;

  if (!validateName(name)) {
    throw new Error(
      `Invalid agent name "${name}". Must match: lowercase letters, numbers, and hyphens (e.g. my-agent)`,
    );
  }

  return {
    apiVersion: 'v1',
    name,
    description: opts.description ?? DEFAULT_DESCRIPTION,
    model: opts.model ?? DEFAULT_MODEL,
    instructions: DEFAULT_INSTRUCTIONS,
  };
}

function printNextSteps(): void {
  heading('Next steps');
  info(`Edit ${chalk.bold('agent.yaml')} to customize your agent definition`);
  info(`Run ${chalk.cyan('automagent validate')} to check your definition`);
  info(`Run ${chalk.cyan('automagent run')} to test your agent locally`);
}

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Create a new agent.yaml definition file')
    .option('--quick', 'Skip prompts and use defaults or provided values')
    .option('--force', 'Overwrite existing agent.yaml')
    .option('--name <name>', 'Agent name')
    .option('--description <desc>', 'Agent description')
    .option('--model <model>', 'Model identifier')
    .option('--target <targets>', 'Also export to IDE targets after creation (claude-code,cursor,copilot)')
    .action(async (opts: { quick?: boolean; force?: boolean; name?: string; description?: string; model?: string; target?: string }) => {
      const filePath = resolve(process.cwd(), 'agent.yaml');

      if (existsSync(filePath) && !opts.force) {
        error('agent.yaml already exists. Use --force to overwrite.');
        process.exitCode = 1;
        return;
      }

      let config: AgentConfig;
      try {
        if (!opts.quick && !process.stdin.isTTY) {
          info('Non-interactive mode detected, using defaults. Use --quick with --name/--description/--model to customize.');
          opts.quick = true;
        }
        config = opts.quick
          ? buildQuickConfig(opts)
          : await promptForConfig();
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
        return;
      }

      const content = buildYaml(config);
      writeFileSync(filePath, content, 'utf-8');

      success(`Created ${chalk.bold('agent.yaml')}`);

      // Export to targets if requested
      if (opts.target) {
        const targets = opts.target.split(',').map(t => t.trim());
        const agentData = config as Record<string, unknown>;
        const outputDir = dirname(filePath);

        for (const target of targets) {
          let files: Record<string, unknown>;
          switch (target) {
            case 'claude-code':
              files = exportClaudeCode(agentData);
              break;
            case 'cursor':
              files = exportCursor(agentData);
              break;
            case 'copilot':
              files = exportCopilot(agentData);
              break;
            default:
              warn(`Unknown target: ${target}`);
              continue;
          }

          for (const [relativePath, content] of Object.entries(files)) {
            const actualPath = target === 'claude-code' && relativePath === 'plugin.json'
              ? join(outputDir, '.claude-plugin', 'plugin.json')
              : join(outputDir, relativePath);

            const dir = dirname(actualPath);
            if (!existsSync(dir)) {
              mkdirSync(dir, { recursive: true });
            }

            const fileContent = typeof content === 'string'
              ? content
              : JSON.stringify(content, null, 2) + '\n';

            writeFileSync(actualPath, fileContent, 'utf-8');
            info(`Exported ${relativePath}`);
          }
        }
      }

      printNextSteps();
    });
}
