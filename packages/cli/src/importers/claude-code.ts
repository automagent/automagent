import { slugify } from '../utils/slugify.js';

export interface ClaudeCodeInput {
  claudeMd: string;
  mcpJson?: Record<string, Record<string, unknown>>;
  settingsJson?: Record<string, unknown>;
}

export function importClaudeCode(data: ClaudeCodeInput): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Extract name from first heading
  const headingMatch = data.claudeMd.match(/^#\s+(.+)$/m);
  const rawName = headingMatch ? headingMatch[1].trim() : '';
  result['name'] = rawName ? slugify(rawName) : 'imported-agent';

  result['description'] = `Imported from Claude Code agent: ${rawName || 'unknown'}`;
  result['model'] = 'claude-sonnet-4-20250514';
  result['instructions'] = data.claudeMd;

  // MCP servers
  if (data.mcpJson && Object.keys(data.mcpJson).length > 0) {
    const servers: Array<Record<string, unknown>> = [];

    for (const [name, config] of Object.entries(data.mcpJson)) {
      if (config.type === 'http') {
        servers.push({
          name,
          transport: 'streamable-http',
          url: config.url,
        });
      } else {
        const server: Record<string, unknown> = {
          name,
          transport: 'stdio',
        };
        if (config.command) server['command'] = config.command;
        if (config.args) server['args'] = config.args;
        servers.push(server);
      }
    }

    result['mcp'] = servers;
  }

  // Settings → extensions
  if (data.settingsJson) {
    const ext: Record<string, unknown> = {};
    if (data.settingsJson.permissions) {
      ext['permissions'] = data.settingsJson.permissions;
    }
    if (Object.keys(ext).length > 0) {
      result['extensions'] = { 'claude-code': ext };
    }
  }

  return result;
}
