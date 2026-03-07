import { resolve } from 'node:path';
import type { Command } from 'commander';
import { parseYamlFile } from '../utils/yaml.js';
import { validate } from '@automagent/schema';
import type { AgentDefinition, ModelConfig, ToolDefinition } from '@automagent/schema';
import { error, info, heading } from '../utils/output.js';
import { runAgent } from '../runtime/agent-runner.js';
import type { RunConfig } from '../runtime/agent-runner.js';

type Provider = 'anthropic' | 'openai';

interface ProviderInfo {
  provider: Provider;
  envVar: string;
}

const PROVIDER_ENV: Record<Provider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
};

export function detectProvider(model: string | ModelConfig): ProviderInfo {
  // Object form: check explicit provider field first, then id string
  if (typeof model === 'object') {
    if (model.provider) {
      const p = model.provider.toLowerCase();
      if (p.includes('anthropic') || p.includes('claude')) {
        return { provider: 'anthropic', envVar: PROVIDER_ENV.anthropic };
      }
      if (p.includes('openai') || p.includes('gpt')) {
        return { provider: 'openai', envVar: PROVIDER_ENV.openai };
      }
    }
    // Fall through to string detection on id
    return detectProvider(model.id);
  }

  // String form
  const lower = model.toLowerCase();
  if (lower.includes('claude') || lower.includes('anthropic')) {
    return { provider: 'anthropic', envVar: PROVIDER_ENV.anthropic };
  }
  if (lower.includes('gpt') || lower.includes('openai') || lower.includes('o1') || lower.includes('o3')) {
    return { provider: 'openai', envVar: PROVIDER_ENV.openai };
  }

  // Default to anthropic
  return { provider: 'anthropic', envVar: PROVIDER_ENV.anthropic };
}

export function resolveModelString(model: string | ModelConfig): string {
  return typeof model === 'object' ? model.id : model;
}

export function resolveInstructions(def: AgentDefinition): string {
  const instr = def.instructions;
  if (!instr) {
    return `You are ${def.name}. ${def.description}`;
  }
  if (typeof instr === 'string') {
    return instr;
  }
  // Structured instructions: extract system prompt
  if (typeof instr.system === 'string') {
    return instr.system;
  }
  return `You are ${def.name}. ${def.description}`;
}

export function runCommand(program: Command): void {
  program
    .command('run')
    .description('Run an agent interactively from an agent.yaml definition')
    .argument('[path]', 'path to agent.yaml', './agent.yaml')
    .option('--model <model>', 'override model identifier')
    .action(async (path: string, opts: { model?: string }) => {
      const filePath = resolve(path);

      // Parse YAML
      const { data, error: parseError } = parseYamlFile(filePath);
      if (parseError) {
        error(parseError);
        process.exit(1);
      }

      // Validate against schema
      const result = validate(data);
      if (!result.valid) {
        error('Invalid agent definition:');
        for (const e of result.errors) {
          const location = e.instancePath || '/';
          error(`  ${location}: ${e.message ?? 'validation error'}`);
        }
        process.exit(1);
      }

      const def = data as AgentDefinition;

      // Determine model (flag overrides definition)
      const modelSource = opts.model ?? def.model;
      const modelString = opts.model ?? resolveModelString(def.model);
      const { provider, envVar } = detectProvider(modelSource);

      // Check API key
      if (!process.env[envVar]) {
        error(`Missing API key. Set the ${envVar} environment variable.`);
        info(`Export it in your shell: export ${envVar}=sk-...`);
        process.exit(1);
      }

      heading(`Running ${def.name}`);

      const tools: RunConfig['tools'] = (def.tools ?? []).map((t: ToolDefinition) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }));

      const config: RunConfig = {
        name: def.name,
        model: modelString,
        provider,
        instructions: resolveInstructions(def),
        tools,
      };

      await runAgent(config);
    });
}
