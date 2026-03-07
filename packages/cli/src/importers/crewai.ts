export interface CrewAIAgent {
  role: string;
  goal: string;
  backstory: string;
  llm?: string;
  tools?: Array<string | { name: string; [key: string]: unknown }>;
  verbose?: boolean;
  allow_delegation?: boolean;
  [key: string]: unknown;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'imported-agent';
}

const MODEL_MAP: Record<string, string> = {
  'claude-3-sonnet': 'claude-sonnet-4-20250514',
  'claude-3-opus': 'claude-opus-4-20250514',
  'claude-3-haiku': 'claude-haiku-4-20250514',
  'claude-3.5-sonnet': 'claude-sonnet-4-20250514',
  'claude-3.5-haiku': 'claude-haiku-4-20250514',
};

export function importCrewAI(data: CrewAIAgent): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  result['name'] = slugify(data.role);
  result['description'] = `Imported from CrewAI agent: ${data.role}`;
  result['instructions'] = `Goal: ${data.goal}\n\nBackstory: ${data.backstory}`;

  if (data.llm) {
    const mapped = MODEL_MAP[data.llm];
    if (mapped) {
      result['model'] = mapped;
    } else if (data.llm.startsWith('gpt-') || data.llm.startsWith('claude-') || data.llm.startsWith('o1') || data.llm.startsWith('o3')) {
      result['model'] = data.llm;
    } else {
      result['model'] = data.llm;
      result['# TODO: Review model'] = `Unknown model "${data.llm}" - verify this is a valid model identifier`;
    }
  } else {
    result['model'] = 'gpt-4'; // TODO: Review - default model
  }

  if (data.tools && data.tools.length > 0) {
    result['tools'] = data.tools.map((tool) => {
      if (typeof tool === 'string') {
        return { name: tool };
      }
      const { name: toolName, ...rest } = tool;
      return { name: toolName, ...rest };
    });
  }

  // Collect unmapped fields into extensions.crewai
  const knownKeys = new Set(['role', 'goal', 'backstory', 'llm', 'tools']);
  const unmapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!knownKeys.has(key)) {
      unmapped[key] = value;
    }
  }

  if (Object.keys(unmapped).length > 0) {
    result['extensions'] = { crewai: unmapped };
  }

  return result;
}
