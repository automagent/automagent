import { slugify } from '../utils/slugify.js';
import { DEFAULT_IMPORT_MODEL } from '../utils/constants.js';

export interface CursorInput {
  content: string;
  fileName: string;
}

export function importCursor(data: CursorInput): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const { frontmatter, body } = parseFrontmatter(data.content);

  // Name from filename
  const baseName = data.fileName
    .replace(/\.mdc$/, '')
    .replace(/\.md$/, '')
    .replace(/^\.cursorrules$/, '');
  result['name'] = baseName ? slugify(baseName) : 'imported-agent';

  // Description
  result['description'] = frontmatter.description
    ? `Imported from Cursor: ${frontmatter.description}`
    : `Imported from Cursor rule: ${data.fileName}`;
  result['model'] = DEFAULT_IMPORT_MODEL;
  result['instructions'] = body.trim();

  // Globs → context
  if (frontmatter.globs) {
    const globStr = String(frontmatter.globs);
    const globs = globStr.split(',').map((g: string) => g.trim()).filter(Boolean);
    if (globs.length > 0) {
      result['context'] = globs.map((g: string) => ({ file: g }));
    }
  }

  // Extensions
  const ext: Record<string, unknown> = {};
  if (frontmatter.alwaysApply !== undefined) {
    ext['alwaysApply'] = frontmatter.alwaysApply;
  }
  if (Object.keys(ext).length > 0) {
    result['extensions'] = { cursor: ext };
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
    // Parse booleans
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    // Strip surrounding quotes
    else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (key) frontmatter[key] = value;
  }

  return { frontmatter, body: match[2] };
}
