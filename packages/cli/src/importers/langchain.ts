export interface LangChainConfig {
  prompt?: string | { template?: string; [key: string]: unknown };
  llm?: string | { model_name?: string; [key: string]: unknown };
  model?: string;
  tools?: Array<string | { name: string; description?: string; [key: string]: unknown }>;
  agent_type?: string;
  [key: string]: unknown;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'imported-agent';
}

export function importLangChain(data: LangChainConfig, filename?: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Generate name from filename or use default
  if (filename) {
    const base = filename.replace(/\.[^.]+$/, '');
    result['name'] = slugify(base);
  } else {
    result['name'] = 'imported-agent';
  }

  result['description'] = 'Imported from LangChain configuration';

  // Extract instructions from prompt
  if (data.prompt) {
    if (typeof data.prompt === 'string') {
      result['instructions'] = data.prompt;
    } else if (data.prompt.template) {
      result['instructions'] = data.prompt.template;
    }
  }

  // Extract model from llm or model field
  if (data.llm) {
    if (typeof data.llm === 'string') {
      result['model'] = data.llm;
    } else if (data.llm.model_name) {
      result['model'] = data.llm.model_name;
    } else {
      result['model'] = 'gpt-4'; // TODO: Review - could not determine model
    }
  } else if (data.model) {
    result['model'] = data.model;
  } else {
    result['model'] = 'gpt-4'; // TODO: Review - default model
  }

  // Map tools
  if (data.tools && data.tools.length > 0) {
    result['tools'] = data.tools.map((tool) => {
      if (typeof tool === 'string') {
        return { name: tool };
      }
      const mapped: Record<string, unknown> = { name: tool.name };
      if (tool.description) {
        mapped['description'] = tool.description;
      }
      return mapped;
    });
  }

  // Map agent_type and other unmapped fields to extensions
  const knownKeys = new Set(['prompt', 'llm', 'model', 'tools', 'agent_type']);
  const unmapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.has(key)) {
      unmapped[key] = value;
    }
  }

  const langchainExt: Record<string, unknown> = {};
  if (data.agent_type) {
    langchainExt['agent_type'] = data.agent_type;
  }
  if (Object.keys(unmapped).length > 0) {
    Object.assign(langchainExt, unmapped);
  }

  if (Object.keys(langchainExt).length > 0) {
    result['extensions'] = { langchain: langchainExt };
  }

  return result;
}
