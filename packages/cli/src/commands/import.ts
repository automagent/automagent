import type { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname, basename, join, dirname } from 'node:path';
import { stringify } from 'yaml';
import { validate } from '@automagent/schema';
import { parseYamlFile } from '../utils/yaml.js';
import { success, error, warn, info, heading } from '../utils/output.js';
import { importCrewAI } from '../importers/crewai.js';
import { importOpenAI } from '../importers/openai.js';
import { importLangChain } from '../importers/langchain.js';
import { importClaudeCode } from '../importers/claude-code.js';
import { importCursor } from '../importers/cursor.js';
import { importCopilot } from '../importers/copilot.js';
import { SCHEMA_HEADER } from '../utils/constants.js';

export type SupportedFormat = 'crewai' | 'openai' | 'langchain' | 'claude-code' | 'cursor' | 'copilot';
const TODO_COMMENT = '# TODO: Review';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function detectFormat(filePath: string, data?: Record<string, unknown>): SupportedFormat | null {
  const ext = extname(filePath).toLowerCase();
  const base = basename(filePath);

  // Filename-based detection for new IDE formats (check before requiring parsed data)
  // Cursor: .cursorrules or .mdc files
  if (base === '.cursorrules' || ext === '.mdc') return 'cursor';
  // Copilot: copilot-instructions.md or .instructions.md files
  if (base === 'copilot-instructions.md' || base.endsWith('.instructions.md')) return 'copilot';
  // Claude Code: CLAUDE.md
  if (base === 'CLAUDE.md') return 'claude-code';

  // For legacy formats, we need parsed data
  if (!data) return null;

  // CrewAI: YAML with role + goal + backstory (flat or agents-array wrapper)
  if (ext === '.yaml' || ext === '.yml') {
    if ('role' in data && 'goal' in data && 'backstory' in data) {
      return 'crewai';
    }
    if (Array.isArray(data['agents']) && data['agents'].length > 0) {
      const first = data['agents'][0];
      if (isRecord(first) && 'role' in first && 'goal' in first && 'backstory' in first) {
        return 'crewai';
      }
    }
  }

  // OpenAI: JSON with instructions + model (+ optionally tools)
  if (ext === '.json' && 'instructions' in data && 'model' in data) {
    return 'openai';
  }

  // LangChain: JSON with prompt/system_message and/or agent_type/llm-object
  if (ext === '.json') {
    const hasPrompt = 'prompt' in data || 'system_message' in data;
    const hasLangChainLlm = 'agent_type' in data || (typeof data['llm'] === 'object' && data['llm'] !== null);
    if (hasPrompt || hasLangChainLlm) {
      return 'langchain';
    }
  }

  return null;
}

export function parseInputFile(filePath: string): Record<string, unknown> {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.yaml' || ext === '.yml') {
    const result = parseYamlFile(filePath);
    if (result.error || !result.data) {
      throw new Error(result.error ?? 'Failed to parse YAML file');
    }
    if (!isRecord(result.data)) {
      throw new Error('Expected YAML file to contain a mapping at the top level');
    }
    return result.data;
  }

  if (ext === '.json') {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      throw new Error('Expected JSON file to contain an object at the top level');
    }
    return parsed;
  }

  throw new Error(`Unsupported file extension: ${ext}. Supported: .yaml, .yml, .json`);
}

export function addTodoComments(yamlStr: string, agentData: Record<string, unknown>): string {
  const lines = yamlStr.split('\n');
  const result: string[] = [];

  // Add TODO for fields that may need review
  const todoFields = new Set<string>();

  if (typeof agentData['model'] === 'string' && agentData['# TODO: Review model']) {
    todoFields.add('model');
  }

  // Always mark description for review since it is auto-generated
  todoFields.add('description');

  for (const line of lines) {
    const fieldMatch = line.match(/^(\w[\w-]*):/);
    if (fieldMatch && todoFields.has(fieldMatch[1])) {
      result.push(`${line} ${TODO_COMMENT}`);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

export function runValidation(data: Record<string, unknown>): void {
  // Remove any internal comment markers before validation
  const cleanData = { ...data };
  for (const key of Object.keys(cleanData)) {
    if (key.startsWith('#')) {
      delete cleanData[key];
    }
  }

  const result = validate(cleanData);

  if (result.valid) {
    success('Generated file passes schema validation');
  } else {
    warn('Generated file has validation issues:');
    for (const err of result.errors) {
      const path = err.instancePath || '(root)';
      warn(`  ${path}: ${err.message ?? 'unknown error'}`);
    }
    info('Fix these issues or run "automagent validate" after editing');
  }
}

export function importCommand(program: Command): void {
  program
    .command('import')
    .description('Import agent definition from another framework')
    .argument('<path>', 'Path to the source configuration file')
    .option('-o, --output <path>', 'Output file path', './agent.yaml')
    .option('-f, --format <format>', 'Force source format (crewai|openai|langchain)')
    .option('--force', 'Overwrite existing output file', false)
    .action((inputPath: string, options: { output: string; format?: string; force: boolean }) => {
      const resolvedInput = resolve(inputPath);
      const resolvedOutput = resolve(options.output);

      heading('Importing agent definition');

      // Validate input file exists
      if (!existsSync(resolvedInput)) {
        error(`Input file not found: ${resolvedInput}`);
        process.exitCode = 1;
        return;
      }

      // Check output file
      if (existsSync(resolvedOutput) && !options.force) {
        error(`Output file already exists: ${resolvedOutput}`);
        info('Use --force to overwrite');
        process.exitCode = 1;
        return;
      }

      // Detect or validate format
      let format: SupportedFormat;
      if (options.format) {
        const valid: SupportedFormat[] = ['crewai', 'openai', 'langchain', 'claude-code', 'cursor', 'copilot'];
        if (!valid.includes(options.format as SupportedFormat)) {
          error(`Unknown format: ${options.format}`);
          info('Supported formats: crewai, openai, langchain, claude-code, cursor, copilot');
          process.exitCode = 1;
          return;
        }
        format = options.format as SupportedFormat;
      } else {
        // Try filename-based detection first (for text formats)
        const detected = detectFormat(resolvedInput);
        if (!detected) {
          // Try parsing as YAML/JSON for legacy formats
          let data: Record<string, unknown>;
          try {
            data = parseInputFile(resolvedInput);
          } catch (err) {
            error(`Failed to parse input file: ${err instanceof Error ? err.message : String(err)}`);
            error('Could not auto-detect source format');
            info('Supported formats:');
            info('  crewai      - YAML with role + goal + backstory');
            info('  openai      - JSON with instructions + model');
            info('  langchain   - JSON with prompt/system_message + llm/agent_type');
            info('  claude-code - CLAUDE.md');
            info('  cursor      - .cursorrules or .mdc files');
            info('  copilot     - copilot-instructions.md or .instructions.md');
            info('Use --format <format> to specify explicitly');
            process.exitCode = 1;
            return;
          }
          const detectedFromData = detectFormat(resolvedInput, data);
          if (!detectedFromData) {
            error('Could not auto-detect source format from file content');
            info('Supported formats:');
            info('  crewai      - YAML with role + goal + backstory');
            info('  openai      - JSON with instructions + model');
            info('  langchain   - JSON with prompt/system_message + llm/agent_type');
            info('  claude-code - CLAUDE.md');
            info('  cursor      - .cursorrules or .mdc files');
            info('  copilot     - copilot-instructions.md or .instructions.md');
            info('Use --format <format> to specify explicitly');
            process.exitCode = 1;
            return;
          }
          format = detectedFromData;
          info(`Detected format: ${format}`);
        } else {
          format = detected;
          info(`Detected format: ${format}`);
        }
      }

      // Run the appropriate importer
      let agentData: Record<string, unknown>;
      switch (format) {
        case 'cursor': {
          const content = readFileSync(resolvedInput, 'utf-8');
          const fileName = basename(resolvedInput);
          agentData = importCursor({ content, fileName });
          break;
        }
        case 'copilot': {
          const content = readFileSync(resolvedInput, 'utf-8');
          const fileName = basename(resolvedInput);
          agentData = importCopilot({ content, fileName });
          break;
        }
        case 'claude-code': {
          const content = readFileSync(resolvedInput, 'utf-8');
          const dir = dirname(resolvedInput);
          let mcpJson: Record<string, Record<string, unknown>> | undefined;
          const mcpPath = join(dir, '.mcp.json');
          if (existsSync(mcpPath)) {
            mcpJson = JSON.parse(readFileSync(mcpPath, 'utf-8'));
          }
          let settingsJson: Record<string, unknown> | undefined;
          const settingsPath = join(dir, '.claude', 'settings.local.json');
          if (existsSync(settingsPath)) {
            settingsJson = JSON.parse(readFileSync(settingsPath, 'utf-8'));
          }
          agentData = importClaudeCode({ claudeMd: content, mcpJson, settingsJson });
          break;
        }
        case 'crewai': {
          const data = parseInputFile(resolvedInput);
          let crewaiData = data;
          if (Array.isArray(data['agents']) && data['agents'].length > 0) {
            if (data['agents'].length > 1) {
              info(`Found ${data['agents'].length} agents in file — only the first agent will be imported`);
            }
            crewaiData = data['agents'][0] as Record<string, unknown>;
          }
          agentData = importCrewAI(crewaiData as Parameters<typeof importCrewAI>[0]);
          break;
        }
        case 'openai': {
          const data = parseInputFile(resolvedInput);
          agentData = importOpenAI(data as Parameters<typeof importOpenAI>[0]);
          break;
        }
        case 'langchain': {
          const data = parseInputFile(resolvedInput);
          agentData = importLangChain(data as Parameters<typeof importLangChain>[0]);
          break;
        }
      }

      // Serialize to YAML
      const cleanData = { ...agentData };
      for (const key of Object.keys(cleanData)) {
        if (key.startsWith('#')) {
          delete cleanData[key];
        }
      }

      let yamlStr = stringify(cleanData, { lineWidth: 120 });
      yamlStr = addTodoComments(yamlStr, agentData);

      const output = `${SCHEMA_HEADER}\n${yamlStr}`;

      // Write output
      try {
        writeFileSync(resolvedOutput, output, 'utf-8');
        success(`Written to ${resolvedOutput}`);
      } catch (err) {
        error(`Failed to write output: ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
        return;
      }

      // Run validation on the generated data
      runValidation(cleanData);
    });
}
