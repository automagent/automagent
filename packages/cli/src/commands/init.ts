import { createInterface } from 'node:readline/promises';
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { stringify } from 'yaml';
import chalk from 'chalk';
import { success, warn, error, info, heading } from '../utils/output.js';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_NAME = 'my-agent';
const DEFAULT_DESCRIPTION = 'A helpful assistant';
const DEFAULT_INSTRUCTIONS = 'You are a helpful assistant.';
const NAME_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const SCHEMA_DIRECTIVE = '# yaml-language-server: $schema=https://automagent.dev/schema/v1.json';

interface AgentConfig {
  name: string;
  description: string;
  model: string;
  instructions: string;
}

function validateName(name: string): boolean {
  return NAME_PATTERN.test(name);
}

function buildYaml(config: AgentConfig): string {
  const yamlBody = stringify(config, { lineWidth: 0 });
  return `${SCHEMA_DIRECTIVE}\n${yamlBody}`;
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
    return { name, description, model, instructions };
  } finally {
    rl.close();
  }
}

function buildQuickConfig(opts: {
  name?: string;
  description?: string;
  model?: string;
}): AgentConfig {
  const name = opts.name ?? DEFAULT_NAME;

  if (!validateName(name)) {
    error(
      `Invalid agent name "${name}". Must match: lowercase letters, numbers, and hyphens (e.g. my-agent)`,
    );
    process.exit(1);
  }

  return {
    name,
    description: opts.description ?? DEFAULT_DESCRIPTION,
    model: opts.model ?? DEFAULT_MODEL,
    instructions: DEFAULT_INSTRUCTIONS,
  };
}

function printNextSteps(filePath: string): void {
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
    .action(async (opts: { quick?: boolean; force?: boolean; name?: string; description?: string; model?: string }) => {
      const filePath = resolve(process.cwd(), 'agent.yaml');

      if (existsSync(filePath) && !opts.force) {
        error('agent.yaml already exists. Use --force to overwrite.');
        process.exit(1);
      }

      const config = opts.quick
        ? buildQuickConfig(opts)
        : await promptForConfig();

      const content = buildYaml(config);
      writeFileSync(filePath, content, 'utf-8');

      success(`Created ${chalk.bold('agent.yaml')}`);
      printNextSteps(filePath);
    });
}
