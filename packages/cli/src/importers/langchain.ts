import chalk from 'chalk';
import { slugify } from '../utils/slugify.js';
import { DEFAULT_IMPORT_MODEL } from '../utils/constants.js';

export interface LangChainAgentConfig {
  name?: string;
  agent_type?: string;
  llm?: string | {
    model_name?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
    [key: string]: unknown;
  };
  model?: string;
  prompt?: string;
  system_message?: string;
  tools?: Array<string | {
    name: string;
    description?: string;
    args_schema?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  tags?: string[];
  metadata?: Record<string, unknown>;
  memory_type?: string;
  memory_config?: Record<string, unknown>;
  [key: string]: unknown;
}

function resolveName(data: LangChainAgentConfig): string {
  if (data.name) return slugify(data.name);
  const metaName = data.metadata?.['name'];
  if (typeof metaName === 'string') return slugify(metaName);
  if (data.agent_type) return slugify(data.agent_type);
  return 'imported-agent';
}

function resolveModel(data: LangChainAgentConfig): string | Record<string, unknown> {
  if (!data.llm) {
    return data.model ?? DEFAULT_IMPORT_MODEL;
  }

  if (typeof data.llm === 'string') {
    return data.llm;
  }

  const id = data.llm.model ?? data.llm.model_name;
  if (!id) return DEFAULT_IMPORT_MODEL;

  const settings: Record<string, unknown> = {};
  if (data.llm.temperature !== undefined) settings['temperature'] = data.llm.temperature;
  if (data.llm.max_tokens !== undefined) settings['max_tokens'] = data.llm.max_tokens;

  if (Object.keys(settings).length > 0) {
    return { id, settings };
  }
  return { id };
}

export function importLangChain(data: LangChainAgentConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  result['name'] = resolveName(data);
  result['description'] = `Imported from LangChain agent: ${data.name ?? data.agent_type ?? result['name']}`;

  const instructions = data.prompt ?? data.system_message;
  if (instructions) {
    result['instructions'] = instructions;
  }

  result['model'] = resolveModel(data);

  if (data.tools && data.tools.length > 0) {
    result['tools'] = data.tools.map((tool) => {
      if (typeof tool === 'string') {
        return { name: tool };
      }
      const mapped: Record<string, unknown> = { name: tool.name };
      if (tool.description) mapped['description'] = tool.description;
      if (tool.args_schema) mapped['inputSchema'] = tool.args_schema;
      return mapped;
    });
  }

  if (data.tags && data.tags.length > 0) {
    result['metadata'] = { tags: data.tags };
  }

  // Handle memory config — warn and preserve in extensions
  const hasMemory = data.memory_type !== undefined || data.memory_config !== undefined;
  if (hasMemory) {
    console.warn(chalk.yellow('  \u26A0 LangChain memory config is not supported and was dropped'));
  }

  // Collect unmapped fields into extensions.langchain
  const knownKeys = new Set(['name', 'agent_type', 'metadata', 'llm', 'model', 'prompt', 'system_message', 'tools', 'tags', 'memory_type', 'memory_config']);
  const unmapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.has(key)) {
      unmapped[key] = value;
    }
  }

  // Preserve memory config in extensions.langchain.memory
  if (hasMemory) {
    const memory: Record<string, unknown> = {};
    if (data.memory_type !== undefined) memory['type'] = data.memory_type;
    if (data.memory_config !== undefined) Object.assign(memory, data.memory_config);
    unmapped['memory'] = memory;
  }

  if (Object.keys(unmapped).length > 0) {
    result['extensions'] = { langchain: unmapped };
  }

  return result;
}
