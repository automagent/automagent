import { slugify } from '../utils/slugify.js';
import { DEFAULT_IMPORT_MODEL } from '../utils/constants.js';

export interface OpenAIAgentConfig {
  name: string;
  instructions?: string;
  model?: string;
  tools?: Array<{
    type: string;
    function?: {
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    };
  }>;
  handoffs?: Array<string | { name: string; [key: string]: unknown }>;
  file_ids?: string[];
  [key: string]: unknown;
}

export function importOpenAI(data: OpenAIAgentConfig): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  result['name'] = slugify(data.name);
  result['description'] = `Imported from OpenAI agent: ${data.name}`;

  if (data.instructions) {
    result['instructions'] = data.instructions;
  }

  result['model'] = data.model ?? DEFAULT_IMPORT_MODEL;

  // Separate function tools from other tool types
  const functionTools: Array<Record<string, unknown>> = [];
  const extensionTools: Array<Record<string, unknown>> = [];

  if (data.tools) {
    for (const tool of data.tools) {
      if (tool.type === 'function' && tool.function) {
        const mapped: Record<string, unknown> = { name: tool.function.name };
        if (tool.function.description) {
          mapped['description'] = tool.function.description;
        }
        if (tool.function.parameters) {
          mapped['inputSchema'] = tool.function.parameters;
        }
        functionTools.push(mapped);
      } else {
        extensionTools.push(tool);
      }
    }
  }

  if (functionTools.length > 0) {
    result['tools'] = functionTools;
  }

  // Map file_ids to context sources
  if (data.file_ids && data.file_ids.length > 0) {
    result['context'] = data.file_ids.map((fileId) => ({ file: fileId }));
  }

  // Map handoffs to dependencies.agents
  if (data.handoffs && data.handoffs.length > 0) {
    const agents = data.handoffs.map((handoff) => {
      const name = typeof handoff === 'string' ? handoff : handoff.name;
      return { ref: slugify(name), role: 'handoff' };
    });
    result['dependencies'] = { agents };
  }

  // Collect extension tool types (code_interpreter, file_search, etc.)
  const extensions: Record<string, unknown> = {};
  if (extensionTools.length > 0) {
    extensions['tools'] = extensionTools;
  }

  // Collect unmapped top-level fields
  const knownKeys = new Set(['name', 'instructions', 'model', 'tools', 'handoffs', 'file_ids']);
  const unmapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.has(key)) {
      unmapped[key] = value;
    }
  }
  if (Object.keys(unmapped).length > 0) {
    Object.assign(extensions, unmapped);
  }

  if (Object.keys(extensions).length > 0) {
    result['extensions'] = { openai: extensions };
  }

  return result;
}
