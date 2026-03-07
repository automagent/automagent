import { describe, it, expect } from 'vitest';
import { validate, fixtures } from '@automagent/schema';
import { importCrewAI } from '../../importers/crewai.js';
import { importOpenAI } from '../../importers/openai.js';
import { importLangChain } from '../../importers/langchain.js';

// =============================================================================
// 1. Shared fixtures validate through schema (cross-package contract)
// =============================================================================

describe('shared fixtures — schema contract', () => {
  for (const [name, fixture] of Object.entries(fixtures.VALID_FIXTURES)) {
    it(`valid fixture ${name} passes validate()`, () => {
      expect(validate(fixture).valid).toBe(true);
    });
  }

  for (const [name, fixture] of Object.entries(fixtures.INVALID_FIXTURES)) {
    it(`invalid fixture ${name} fails validate()`, () => {
      expect(validate(fixture).valid).toBe(false);
    });
  }
});

// =============================================================================
// 2. Importer output validates against schema
// =============================================================================

describe('importer output — schema contract', () => {
  describe('CrewAI importer', () => {
    it('minimal CrewAI import produces valid output', () => {
      const result = importCrewAI({ role: 'analyst', goal: 'analyze', backstory: 'expert' });
      expect(validate(result).valid).toBe(true);
    });

    it('CrewAI import with tools produces valid output', () => {
      const result = importCrewAI({
        role: 'researcher', goal: 'research topics', backstory: 'senior researcher',
        tools: ['web_search', { name: 'calculator' }],
      });
      expect(validate(result).valid).toBe(true);
    });

    it('CrewAI import with extensions produces valid output', () => {
      const result = importCrewAI({
        role: 'writer', goal: 'write', backstory: 'creative',
        verbose: true, allow_delegation: false,
      });
      expect(validate(result).valid).toBe(true);
    });

    it('CrewAI import with custom model produces valid output', () => {
      const result = importCrewAI({ role: 'agent', goal: 'g', backstory: 'b', llm: 'gpt-4-turbo' });
      expect(validate(result).valid).toBe(true);
    });
  });

  describe('OpenAI importer', () => {
    it('minimal OpenAI import produces valid output', () => {
      expect(validate(importOpenAI({ name: 'My Bot' })).valid).toBe(true);
    });

    it('OpenAI import with function tools produces valid output', () => {
      const result = importOpenAI({
        name: 'search-bot', instructions: 'Search.', model: 'gpt-4-turbo',
        tools: [{
          type: 'function',
          function: { name: 'search', description: 'Web search', parameters: { type: 'object', properties: { q: { type: 'string' } } } },
        }],
      });
      expect(validate(result).valid).toBe(true);
    });

    it('OpenAI import with handoffs produces valid output', () => {
      expect(validate(importOpenAI({ name: 'router', handoffs: ['spec-a', { name: 'spec-b' }] })).valid).toBe(true);
    });

    it('OpenAI import with non-function tools produces valid output', () => {
      expect(validate(importOpenAI({ name: 'coder', tools: [{ type: 'code_interpreter' }] })).valid).toBe(true);
    });
  });

  describe('LangChain importer', () => {
    it('minimal LangChain import produces valid output', () => {
      expect(validate(importLangChain({}, 'my-agent.json')).valid).toBe(true);
    });

    it('LangChain import with all fields produces valid output', () => {
      const result = importLangChain({
        prompt: { template: 'You are helpful.' },
        llm: { model_name: 'gpt-4-turbo' },
        tools: ['serpapi', 'llm-math'],
        agent_type: 'zero-shot-react-description',
      });
      expect(validate(result).valid).toBe(true);
    });
  });

  describe('all importers set required fields', () => {
    const cases = [
      { name: 'CrewAI', fn: () => importCrewAI({ role: 'r', goal: 'g', backstory: 'b' }) },
      { name: 'OpenAI', fn: () => importOpenAI({ name: 'bot' }) },
      { name: 'LangChain', fn: () => importLangChain({}) },
    ];
    for (const { name, fn } of cases) {
      it(`${name} output has name, description, and model`, () => {
        const result = fn();
        expect(typeof result['name']).toBe('string');
        expect((result['name'] as string).length).toBeGreaterThan(0);
        expect(typeof result['description']).toBe('string');
        expect((result['description'] as string).length).toBeGreaterThan(0);
        expect(result['model']).toBeDefined();
      });
    }
  });
});
