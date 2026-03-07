import type { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname, basename } from 'node:path';
import { stringify } from 'yaml';
import { validate } from '@automagent/schema';
import { parseYamlFile } from '../utils/yaml.js';
import { success, error, warn, info, heading } from '../utils/output.js';
import { importCrewAI } from '../importers/crewai.js';
import { importOpenAI } from '../importers/openai.js';
import { importLangChain } from '../importers/langchain.js';

type SupportedFormat = 'crewai' | 'openai' | 'langchain';

const SCHEMA_HEADER = '# yaml-language-server: $schema=https://automagent.dev/schema/v1.json';
const TODO_COMMENT = '# TODO: Review';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function detectFormat(filePath: string, data: Record<string, unknown>): SupportedFormat | null {
  const ext = extname(filePath).toLowerCase();

  // CrewAI: YAML with role + goal + backstory
  if ((ext === '.yaml' || ext === '.yml') && 'role' in data && 'goal' in data && 'backstory' in data) {
    return 'crewai';
  }

  // OpenAI: JSON with instructions + model (+ optionally tools)
  if (ext === '.json' && 'instructions' in data && 'model' in data) {
    return 'openai';
  }

  // LangChain: .py or .json with prompt/llm_chain/agent_executor
  if (ext === '.py' || ext === '.json') {
    if ('prompt' in data || 'llm_chain' in data || 'agent_executor' in data) {
      return 'langchain';
    }
  }

  return null;
}

function parseInputFile(filePath: string): Record<string, unknown> {
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

  if (ext === '.py') {
    // For Python files, we attempt to find embedded JSON config
    // This is a best-effort heuristic for LangChain exports
    const raw = readFileSync(filePath, 'utf-8');
    const jsonMatch = raw.match(/\{[\s\S]*"(?:prompt|llm_chain|agent_executor)"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed: unknown = JSON.parse(jsonMatch[0]);
        if (isRecord(parsed)) {
          return parsed;
        }
      } catch {
        // Fall through to error
      }
    }
    throw new Error(
      'Could not extract configuration from Python file. ' +
      'Export your LangChain agent config as JSON and try again.'
    );
  }

  throw new Error(`Unsupported file extension: ${ext}. Supported: .yaml, .yml, .json, .py`);
}

function addTodoComments(yamlStr: string, agentData: Record<string, unknown>): string {
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

function runValidation(data: Record<string, unknown>): void {
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

      // Parse input
      let data: Record<string, unknown>;
      try {
        data = parseInputFile(resolvedInput);
      } catch (err) {
        error(`Failed to parse input file: ${err instanceof Error ? err.message : String(err)}`);
        process.exitCode = 1;
        return;
      }

      // Detect or validate format
      let format: SupportedFormat;
      if (options.format) {
        const valid: SupportedFormat[] = ['crewai', 'openai', 'langchain'];
        if (!valid.includes(options.format as SupportedFormat)) {
          error(`Unknown format: ${options.format}`);
          info('Supported formats: crewai, openai, langchain');
          process.exitCode = 1;
          return;
        }
        format = options.format as SupportedFormat;
      } else {
        const detected = detectFormat(resolvedInput, data);
        if (!detected) {
          error('Could not auto-detect source format from file content');
          info('Supported formats:');
          info('  crewai    - YAML with role + goal + backstory');
          info('  openai    - JSON with instructions + model');
          info('  langchain - JSON/Python with prompt or llm_chain or agent_executor');
          info('Use --format <format> to specify explicitly');
          process.exitCode = 1;
          return;
        }
        format = detected;
        info(`Detected format: ${format}`);
      }

      // Run the appropriate importer
      let agentData: Record<string, unknown>;
      switch (format) {
        case 'crewai':
          agentData = importCrewAI(data as Parameters<typeof importCrewAI>[0]);
          break;
        case 'openai':
          agentData = importOpenAI(data as Parameters<typeof importOpenAI>[0]);
          break;
        case 'langchain':
          agentData = importLangChain(
            data as Parameters<typeof importLangChain>[0],
            basename(resolvedInput),
          );
          break;
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
