/**
 * Shared frontmatter parser for Cursor (.mdc) and Copilot (.instructions.md) files.
 *
 * Parses YAML-like frontmatter delimited by `---` lines. Handles:
 * - Boolean values (`true` / `false`)
 * - Quoted strings (strips surrounding double-quotes)
 * - Plain string values
 */
export function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
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
