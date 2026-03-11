import { slugify } from '../utils/slugify.js';
import { DEFAULT_IMPORT_MODEL } from '../utils/constants.js';

export interface CopilotInput {
  content: string;
  fileName: string;
}

export function importCopilot(data: CopilotInput): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const { frontmatter, body } = parseFrontmatter(data.content);

  // Name from filename
  const baseName = data.fileName
    .replace(/\.instructions\.md$/, '')
    .replace(/\.prompt\.md$/, '')
    .replace(/^copilot-instructions\.md$/, '');
  result['name'] = baseName ? slugify(baseName) : 'imported-agent';

  result['description'] = `Imported from GitHub Copilot: ${data.fileName}`;
  result['model'] = DEFAULT_IMPORT_MODEL;
  result['instructions'] = body.trim();

  // applyTo → context
  if (frontmatter.applyTo) {
    const patterns = String(frontmatter.applyTo).split(',').map((p: string) => p.trim()).filter(Boolean);
    if (patterns.length > 0) {
      result['context'] = patterns.map((p: string) => ({ file: p }));
    }
  }

  // Extensions
  const ext: Record<string, unknown> = {};
  if (frontmatter.excludeAgent) {
    ext['excludeAgent'] = frontmatter.excludeAgent;
  }
  if (Object.keys(ext).length > 0) {
    result['extensions'] = { copilot: ext };
  }

  return result;
}

function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: Record<string, unknown> = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (key) frontmatter[key] = value;
  }

  return { frontmatter, body: match[2] };
}
