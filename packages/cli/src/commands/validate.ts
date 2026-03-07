import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import type { Command } from 'commander';
import { validate, type ValidationResult } from '@automagent/schema';
import { parseYamlFile } from '../utils/yaml.js';
import { success, warn, error, info, heading } from '../utils/output.js';

/**
 * Known unpinned model aliases that should trigger a warning.
 * These are short names without date or version suffixes.
 */
const UNPINNED_MODEL_PATTERNS: ReadonlySet<string> = new Set([
  'gpt-4',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'o1',
  'o1-mini',
  'o1-preview',
  'o3',
  'o3-mini',
  'claude-sonnet',
  'claude-haiku',
  'claude-opus',
]);

/**
 * Prefixes that indicate a string is likely an API key or secret.
 */
const SECRET_PREFIXES = ['sk-', 'key-', 'AKIA'] as const;

/**
 * Checks whether a string looks like a high-entropy secret (base64-like
 * with mixed case and digits, longer than 30 characters).
 */
function looksLikeSecret(value: string): boolean {
  for (const prefix of SECRET_PREFIXES) {
    if (value.startsWith(prefix)) {
      return true;
    }
  }

  // Check for base64-like high-entropy strings > 30 chars
  if (value.length > 30) {
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasDigit = /[0-9]/.test(value);
    // Must not contain spaces (real prose has spaces)
    const hasNoSpaces = !/\s/.test(value);
    if (hasUpper && hasLower && hasDigit && hasNoSpaces) {
      return true;
    }
  }

  return false;
}

/**
 * Recursively collects all string values from an object, paired with
 * a human-readable path for error reporting.
 */
function collectStringValues(
  obj: unknown,
  path: string = '',
): Array<{ path: string; value: string }> {
  const results: Array<{ path: string; value: string }> = [];

  if (typeof obj === 'string') {
    results.push({ path, value: obj });
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      results.push(...collectStringValues(obj[i], `${path}[${i}]`));
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const nextPath = path ? `${path}.${key}` : key;
      results.push(...collectStringValues(value, nextPath));
    }
  }

  return results;
}

/**
 * Runs all validation checks against a parsed agent definition and returns
 * structured counts of warnings and errors emitted.
 */
function runChecks(
  data: unknown,
  yamlDir: string,
): { warnings: number; errors: number } {
  let warnings = 0;
  let errors_ = 0;

  // -------------------------------------------------------------------------
  // 1. JSON Schema validation
  // -------------------------------------------------------------------------
  heading('Schema validation');

  const result: ValidationResult = validate(data);

  if (result.valid) {
    success('Schema is valid');
  } else {
    for (const err of result.errors) {
      const location = err.instancePath || '(root)';
      error(`${location}: ${err.message ?? 'unknown error'}`);
      errors_++;
    }
  }

  // The remaining checks operate on the data as a record
  const record = data as Record<string, unknown>;

  // -------------------------------------------------------------------------
  // 2. Unpinned model warning
  // -------------------------------------------------------------------------
  heading('Model check');

  const model = record['model'];
  if (typeof model === 'string') {
    if (UNPINNED_MODEL_PATTERNS.has(model)) {
      warn(
        `Model "${model}" is an unpinned alias. ` +
          'Consider pinning to a specific version (e.g., "claude-sonnet-4-20250514").',
      );
      warnings++;
    } else {
      success(`Model "${model}" is specified`);
    }
  } else if (model !== null && typeof model === 'object') {
    const modelId = (model as Record<string, unknown>)['id'];
    if (typeof modelId === 'string' && UNPINNED_MODEL_PATTERNS.has(modelId)) {
      warn(
        `Model "${modelId}" is an unpinned alias. ` +
          'Consider pinning to a specific version.',
      );
      warnings++;
    } else {
      success('Model configuration is specified');
    }
  }

  // -------------------------------------------------------------------------
  // 3. High-entropy string / API key detection
  // -------------------------------------------------------------------------
  heading('Secret detection');

  const allStrings = collectStringValues(data);
  let secretsFound = 0;

  for (const { path, value } of allStrings) {
    if (looksLikeSecret(value)) {
      error(`Potential API key or secret detected at "${path}"`);
      secretsFound++;
      errors_++;
    }
  }

  if (secretsFound === 0) {
    success('No potential secrets detected');
  }

  // -------------------------------------------------------------------------
  // 4. Context file existence check
  // -------------------------------------------------------------------------
  heading('Context files');

  const context = record['context'];

  if (Array.isArray(context)) {
    let allExist = true;

    for (let i = 0; i < context.length; i++) {
      const item = context[i] as Record<string, unknown> | undefined;
      if (item && typeof item['file'] === 'string') {
        const filePath = resolve(yamlDir, item['file']);
        if (!existsSync(filePath)) {
          warn(`Context file not found: ${item['file']} (resolved to ${filePath})`);
          warnings++;
          allExist = false;
        }
      }
    }

    if (allExist) {
      success('All context file references exist');
    }
  } else {
    info('No context files defined');
  }

  // -------------------------------------------------------------------------
  // 5. Instruction file reference check
  // -------------------------------------------------------------------------
  heading('Instruction files');

  const instructions = record['instructions'];

  if (instructions && typeof instructions === 'object' && !Array.isArray(instructions)) {
    const instrObj = instructions as Record<string, unknown>;
    const system = instrObj['system'];
    if (system && typeof system === 'object' && !Array.isArray(system)) {
      const systemObj = system as Record<string, unknown>;
      if (typeof systemObj['file'] === 'string') {
        const filePath = resolve(yamlDir, systemObj['file']);
        if (!existsSync(filePath)) {
          warn(`Instruction file not found: ${systemObj['file']} (resolved to ${filePath})`);
          warnings++;
        } else {
          success('Instruction file reference exists');
        }
      } else {
        info('No instruction file references');
      }
    } else {
      info('No instruction file references');
    }
  } else {
    info('No instruction file references');
  }

  return { warnings, errors: errors_ };
}

/**
 * Registers the `validate` subcommand on the given Commander program.
 */
export function validateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate an agent.yaml file against the schema')
    .argument('[file]', 'Path to agent.yaml file', './agent.yaml')
    .action((file: string) => {
      const filePath = resolve(file);
      const yamlDir = dirname(filePath);

      heading('Validating ' + filePath);

      // Step 1: Parse YAML
      const parseResult = parseYamlFile(filePath);

      if (parseResult.error !== null) {
        const lineInfo =
          parseResult.line !== null ? ` (line ${parseResult.line})` : '';
        error(`YAML parse error${lineInfo}: ${parseResult.error}`);
        process.exit(1);
      }

      // Step 2-5: Run all validation checks
      const { warnings, errors: errorCount } = runChecks(
        parseResult.data,
        yamlDir,
      );

      // Summary
      heading('Result');

      if (errorCount > 0) {
        error(
          `Validation failed with ${errorCount} error(s) and ${warnings} warning(s).`,
        );
        process.exit(1);
      }

      if (warnings > 0) {
        warn(`Valid with ${warnings} warning(s).`);
      } else {
        success('Valid — no errors or warnings.');
      }
    });
}
