import { slugify } from '../utils/slugify.js';
import { DEFAULT_IMPORT_MODEL } from '../utils/constants.js';
import { parseFrontmatter } from '../utils/frontmatter.js';

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
