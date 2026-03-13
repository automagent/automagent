import type { AgentDefinition } from '@automagent/schema';
import { renderInstructionsBody, renderGuardrailsLines } from '../utils/render-instructions.js';

export function exportClaudeCode(data: AgentDefinition): Record<string, unknown> {
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

function buildSkillMd(data: AgentDefinition): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`name: ${data.name}`);
  lines.push(`description: ${data.description}`);
  lines.push('---');
  lines.push('');

  // Instructions body
  const body = renderInstructionsBody(data, { includeFileRefs: true, personaStyle: 'lines' });
  if (body) lines.push(body);

  // Guardrails
  const guardrailLines = renderGuardrailsLines(data, { includeProhibited: true });
  lines.push(...guardrailLines);

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
