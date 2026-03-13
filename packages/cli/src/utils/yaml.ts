import { readFileSync, existsSync } from 'node:fs';
import { parse, YAMLParseError } from 'yaml';

export interface ParseResult {
  data: unknown;
  error: string | null;
  line: number | null;
}

export function parseYamlFile(filePath: string): ParseResult {
  if (!existsSync(filePath)) {
    return { data: null, error: `File not found: ${filePath}`, line: null };
  }

  const raw = readFileSync(filePath, 'utf-8');
  return parseYamlString(raw);
}

export function parseYamlString(raw: string): ParseResult {
  try {
    const data = parse(raw, { maxAliasCount: 100 });
    if (data !== null && typeof data !== 'object') {
      return { data: null, error: 'YAML content is not an object', line: null };
    }
    return { data, error: null, line: null };
  } catch (err) {
    if (err instanceof YAMLParseError) {
      const line = err.linePos?.[0]?.line ?? null;
      return { data: null, error: err.message, line };
    }
    return { data: null, error: String(err), line: null };
  }
}
