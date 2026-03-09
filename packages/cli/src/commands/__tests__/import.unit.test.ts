import { describe, it, expect, vi } from 'vitest';
import { detectFormat, addTodoComments } from '../../commands/import.js';

vi.mock('../../utils/output.js', () => ({
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  heading: vi.fn(),
}));

describe('detectFormat', () => {
  it('detects CrewAI from .yaml file with role+goal+backstory', () => {
    const data = { role: 'researcher', goal: 'find info', backstory: 'experienced' };
    expect(detectFormat('agent.yaml', data)).toBe('crewai');
  });

  it('detects CrewAI from .yml file with role+goal+backstory', () => {
    const data = { role: 'researcher', goal: 'find info', backstory: 'experienced' };
    expect(detectFormat('agent.yml', data)).toBe('crewai');
  });

  it('detects OpenAI from .json with instructions+model', () => {
    const data = { instructions: 'You are helpful', model: 'gpt-4' };
    expect(detectFormat('assistant.json', data)).toBe('openai');
  });

  it('detects LangChain from .json with system_message', () => {
    const data = { system_message: 'You are a helper' };
    expect(detectFormat('agent.json', data)).toBe('langchain');
  });

  it('detects LangChain from .json with prompt', () => {
    const data = { prompt: 'Do something' };
    expect(detectFormat('agent.json', data)).toBe('langchain');
  });

  it('detects LangChain from .json with agent_type', () => {
    const data = { agent_type: 'zero-shot-react-description' };
    expect(detectFormat('agent.json', data)).toBe('langchain');
  });

  it('detects LangChain from .json with llm as object', () => {
    const data = { llm: { model_name: 'gpt-4', temperature: 0.7 } };
    expect(detectFormat('agent.json', data)).toBe('langchain');
  });

  it('returns null for .json without matching fields', () => {
    const data = { foo: 'bar', baz: 42 };
    expect(detectFormat('config.json', data)).toBeNull();
  });

  it('returns null for .yaml without crewai fields', () => {
    const data = { name: 'my-agent', version: '1.0' };
    expect(detectFormat('config.yaml', data)).toBeNull();
  });

  it('returns null for .txt file', () => {
    const data = { role: 'researcher', goal: 'find info', backstory: 'experienced' };
    expect(detectFormat('notes.txt', data)).toBeNull();
  });

  it('OpenAI takes priority over LangChain when .json has both instructions+model and system_message', () => {
    const data = { instructions: 'You are helpful', model: 'gpt-4', system_message: 'Be nice' };
    expect(detectFormat('agent.json', data)).toBe('openai');
  });
});

describe('addTodoComments', () => {
  it('adds TODO comment to description field', () => {
    const yaml = 'name: my-agent\ndescription: A helpful agent\nmodel: gpt-4';
    const agentData = { name: 'my-agent', description: 'A helpful agent', model: 'gpt-4' };
    const result = addTodoComments(yaml, agentData);
    const lines = result.split('\n');
    expect(lines[0]).toBe('name: my-agent');
    expect(lines[1]).toBe('description: A helpful agent # TODO: Review');
    expect(lines[2]).toBe('model: gpt-4');
  });

  it('does not add TODO to other fields like name or model', () => {
    const yaml = 'name: my-agent\nmodel: gpt-4';
    const agentData = { name: 'my-agent', model: 'gpt-4' };
    const result = addTodoComments(yaml, agentData);
    expect(result).not.toContain('# TODO');
  });

  it('handles YAML with no matching fields gracefully', () => {
    const yaml = 'name: my-agent\nversion: 1.0';
    const agentData = { name: 'my-agent', version: '1.0' };
    const result = addTodoComments(yaml, agentData);
    expect(result).toBe(yaml);
  });

  it('preserves all original lines', () => {
    const yaml = 'name: my-agent\ndescription: A helpful agent\nmodel: gpt-4\ntools:\n  - name: search';
    const agentData = { name: 'my-agent', description: 'A helpful agent', model: 'gpt-4' };
    const result = addTodoComments(yaml, agentData);
    const originalLines = yaml.split('\n');
    const resultLines = result.split('\n');
    expect(resultLines.length).toBe(originalLines.length);
    for (let i = 0; i < originalLines.length; i++) {
      expect(resultLines[i]).toContain(originalLines[i]);
    }
  });
});
