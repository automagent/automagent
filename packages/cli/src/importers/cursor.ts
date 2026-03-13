import { slugify } from '../utils/slugify.js';
import { DEFAULT_IMPORT_MODEL } from '../utils/constants.js';
import { parseFrontmatter } from '../utils/frontmatter.js';

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
