interface AgentInput {
  name: string;
  description: string;
  model?: string | Record<string, unknown>;
  version?: string;
  instructions?: string | Record<string, unknown>;
  mcp?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  guardrails?: Record<string, unknown>;
  context?: Array<Record<string, unknown>>;
  scope?: string;
  [key: string]: unknown;
}

export function exportClaudeCode(data: AgentInput): Record<string, unknown> {
  const files: Record<string, unknown> = {};

  // plugin.json
  const pluginJson: Record<string, unknown> = {
    name: data.name,
    version: data.version ?? '0.1.0',
    description: data.description,
  };

  if (data.metadata) {
    const meta = data.metadata as Record<string, unknown>;
    if (meta.author) pluginJson['author'] = meta.author;
    if (meta.license) pluginJson['license'] = meta.license;
    if (meta.repository) pluginJson['repository'] = meta.repository;
  }

  files['plugin.json'] = pluginJson;

  // SKILL.md
  files[`skills/${data.name}/SKILL.md`] = buildSkillMd(data);

  // .mcp.json
  if (data.mcp && data.mcp.length > 0) {
    files['.mcp.json'] = buildMcpJson(data.mcp);
  }

  return files;
}

function buildSkillMd(data: AgentInput): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`name: ${data.name}`);
  lines.push(`description: ${data.description}`);
  lines.push('---');
  lines.push('');

  // Instructions body
  const instructions = data.instructions;
  if (typeof instructions === 'string') {
    lines.push(instructions);
  } else if (instructions && typeof instructions === 'object') {
    const instr = instructions as Record<string, unknown>;
    if (typeof instr.system === 'string') {
      lines.push(instr.system);
    } else if (instr.system && typeof instr.system === 'object') {
      const sys = instr.system as Record<string, unknown>;
      if (typeof sys.file === 'string') {
        lines.push(`See: ${sys.file}`);
      }
    }

    if (instr.persona && typeof instr.persona === 'object') {
      const persona = instr.persona as Record<string, unknown>;
      lines.push('');
      if (persona.role) lines.push(`**Role:** ${persona.role}`);
      if (persona.tone) lines.push(`**Tone:** ${persona.tone}`);
      if (Array.isArray(persona.expertise)) {
        lines.push(`**Expertise:** ${persona.expertise.join(', ')}`);
      }
    }
  }

  // Guardrails
  const guardrails = data.guardrails as Record<string, unknown> | undefined;
  if (guardrails) {
    const behavioral = guardrails.behavioral as string[] | undefined;
    const prohibited = guardrails.prohibited_actions as string[] | undefined;

    if ((behavioral && behavioral.length > 0) || (prohibited && prohibited.length > 0)) {
      lines.push('');
      lines.push('## Rules');
      if (behavioral) {
        for (const rule of behavioral) {
          lines.push(`- ${rule}`);
        }
      }
      if (prohibited) {
        lines.push('');
        lines.push('## Prohibited Actions');
        for (const action of prohibited) {
          lines.push(`- NEVER: ${action}`);
        }
      }
    }
  }

  return lines.join('\n') + '\n';
}

function buildMcpJson(servers: Array<Record<string, unknown>>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const server of servers) {
    const name = server.name as string;
    const transport = server.transport as string;

    if (transport === 'stdio') {
      const entry: Record<string, unknown> = {};
      if (server.command) entry['command'] = server.command;
      if (server.args) entry['args'] = server.args;
      result[name] = entry;
    } else if (transport === 'streamable-http') {
      result[name] = { type: 'http', url: server.url };
    }
  }

  return result;
}
