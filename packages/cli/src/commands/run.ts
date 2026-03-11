import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import type { Command } from 'commander';
import { parseYamlFile } from '../utils/yaml.js';
import { validate } from '@automagent/schema';
import type { AgentDefinition, ModelConfig, ModelShorthand, ToolDefinition } from '@automagent/schema';
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

export function normalizeModel(model: string | ModelConfig | ModelShorthand): string | ModelConfig {
  if (typeof model === 'string') return model;
  if ('id' in model) return model as ModelConfig;
  // ModelShorthand: convert to ModelConfig
  const shorthand = model as ModelShorthand;
  return { id: shorthand.default, ...(shorthand.settings ? { settings: shorthand.settings } : {}) } as ModelConfig;
}

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
  if (lower.includes('gpt') || lower.includes('openai') || /\bo[13](-|$)/.test(lower)) {
    return { provider: 'openai', envVar: PROVIDER_ENV.openai };
  }

  // Default to anthropic
  return { provider: 'anthropic', envVar: PROVIDER_ENV.anthropic };
}

export function resolveModelString(model: string | ModelConfig): string {
  return typeof model === 'object' ? model.id : model;
}

export function resolveInstructions(def: AgentDefinition, yamlDir?: string): string {
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
  // File reference: read the file content
  if (instr.system && typeof instr.system === 'object' && 'file' in instr.system) {
    const filePath = (instr.system as { file: string }).file;
    const resolvedPath = yamlDir ? resolve(yamlDir, filePath) : resolve(filePath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Instruction file not found: ${resolvedPath}`);
    }
    return readFileSync(resolvedPath, 'utf-8').trim();
  }
  // Persona-only: construct prompt from persona fields
  if (instr.persona) {
    const parts: string[] = [];
    if (instr.persona.role) parts.push(`You are a ${instr.persona.role}.`);
    if (instr.persona.tone) parts.push(`Communicate in a ${instr.persona.tone} tone.`);
    if (instr.persona.expertise && instr.persona.expertise.length > 0) {
      parts.push(`Your expertise: ${(instr.persona.expertise as readonly string[]).join(', ')}.`);
    }
    if (parts.length > 0) return parts.join(' ');
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
        process.exitCode = 1;
        return;
      }

      // Validate against schema
      const result = validate(data);
      if (!result.valid) {
        error('Invalid agent definition:');
        for (const e of result.errors) {
          const location = e.instancePath || '/';
          error(`  ${location}: ${e.message ?? 'validation error'}`);
        }
        process.exitCode = 1;
        return;
      }

      const def = data as AgentDefinition;

      // Determine model (flag overrides definition)
      if (!def.model && !opts.model) {
        error('No model specified in agent.yaml. Use --model to provide one.');
        process.exitCode = 1;
        return;
      }
      const normalized = def.model ? normalizeModel(def.model) : opts.model!;
      const modelSource = opts.model ?? normalized;
      const modelString = opts.model ?? resolveModelString(normalized as string | ModelConfig);
      const { provider, envVar } = detectProvider(modelSource);

      // Check API key
      if (!process.env[envVar]) {
        error(`Missing API key. Set the ${envVar} environment variable.`);
        info(`Export it in your shell: export ${envVar}=sk-...`);
        process.exitCode = 1;
        return;
      }

      heading(`Running ${def.name}`);

      const tools: RunConfig['tools'] = (def.tools ?? []).map((t: ToolDefinition) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
        ...(t.annotations ? { annotations: t.annotations } : {}),
      }));

      const config: RunConfig = {
        name: def.name,
        model: modelString,
        provider,
        instructions: resolveInstructions(def, dirname(filePath)),
        tools,
      };

      await runAgent(config);
    });
}
