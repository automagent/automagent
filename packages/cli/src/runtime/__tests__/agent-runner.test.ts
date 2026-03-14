import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RunConfig } from '../agent-runner.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock ora spinner
const spinnerMock = {
  start: vi.fn().mockReturnThis(),
  stop: vi.fn().mockReturnThis(),
  text: '',
};
vi.mock('ora', () => ({
  default: vi.fn(() => spinnerMock),
}));

// Mock chalk — pass through strings unchanged
vi.mock('chalk', () => {
  const identity = (s: string) => s;
  const handler: ProxyHandler<object> = {
    get: (_target, _prop) => identity,
    apply: (_target, _thisArg, args: unknown[]) => args[0],
  };
  return { default: new Proxy(identity, handler) };
});

// Mock tool-mocker
vi.mock('../tool-mocker.js', () => ({
  mockToolResponse: vi.fn(() => '{"mock":true}'),
}));

// ---------------------------------------------------------------------------
// Readline mock — capture `question` callbacks so tests can feed user input
// ---------------------------------------------------------------------------
let questionCallback: ((input: string) => void) | null = null;

const rlMock = {
  question: vi.fn((_prompt: string, cb: (input: string) => void) => {
    questionCallback = cb;
  }),
  on: vi.fn(() => rlMock),
  close: vi.fn(),
};

vi.mock('node:readline', () => ({
  createInterface: vi.fn(() => rlMock),
}));

// ---------------------------------------------------------------------------
// SDK mocks — must use real function constructors so `new` works
// ---------------------------------------------------------------------------

const anthropicCreateMock = vi.fn();

function MockAnthropic() {
  return { messages: { create: anthropicCreateMock } };
}
const anthropicConstructorSpy = vi.fn(MockAnthropic);

const openaiCreateMock = vi.fn();

function MockOpenAI() {
  return { chat: { completions: { create: openaiCreateMock } } };
}
const openaiConstructorSpy = vi.fn(MockOpenAI);

vi.mock('@anthropic-ai/sdk', () => ({
  default: anthropicConstructorSpy,
}));

vi.mock('openai', () => ({
  default: openaiConstructorSpy,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseConfig(overrides: Partial<RunConfig> = {}): RunConfig {
  return {
    name: 'test-agent',
    model: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    instructions: 'You are a helpful assistant.',
    tools: [],
    ...overrides,
  };
}

/** Simulate one round of user input by invoking the captured readline callback. */
function feedInput(input: string): void {
  const cb = questionCallback;
  if (!cb) throw new Error('No question callback registered — readline not ready');
  questionCallback = null;
  cb(input);
}

/**
 * Wait until the `question` callback has been registered by the prompt loop.
 * Uses micro-ticks so mocked async work can settle.
 */
async function waitForQuestion(maxTicks = 50): Promise<void> {
  for (let i = 0; i < maxTicks; i++) {
    if (questionCallback !== null) return;
    await new Promise((r) => setTimeout(r, 5));
  }
}

/**
 * Re-apply all mocks (auxiliary + SDKs) after vi.resetModules().
 * resetModules clears the module registry so hoisted vi.mock() factories
 * no longer apply. We re-register everything with vi.doMock().
 */
function reapplyAllMocks(): void {
  vi.doMock('ora', () => ({
    default: vi.fn(() => spinnerMock),
  }));
  vi.doMock('chalk', () => {
    const identity = (s: string) => s;
    const handler: ProxyHandler<object> = {
      get: (_target, _prop) => identity,
      apply: (_target, _thisArg, args: unknown[]) => args[0],
    };
    return { default: new Proxy(identity, handler) };
  });
  vi.doMock('../tool-mocker.js', () => ({
    mockToolResponse: vi.fn(() => '{"mock":true}'),
  }));
  vi.doMock('node:readline', () => ({
    createInterface: vi.fn(() => rlMock),
  }));
  vi.doMock('@anthropic-ai/sdk', () => ({
    default: anthropicConstructorSpy,
  }));
  vi.doMock('openai', () => ({
    default: openaiConstructorSpy,
  }));
}

// Suppress console.log during tests
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('agent-runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    questionCallback = null;
    consoleLogSpy.mockClear();
  });

  // =========================================================================
  // 1. Provider dispatch
  // =========================================================================

  describe('provider dispatch', () => {
    it('calls Anthropic SDK when provider is anthropic', async () => {
      anthropicCreateMock.mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello!' }],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(baseConfig({ provider: 'anthropic' }));

      await waitForQuestion();
      feedInput('hi');
      await waitForQuestion();

      expect(anthropicConstructorSpy).toHaveBeenCalled();
      expect(anthropicCreateMock).toHaveBeenCalled();
      expect(openaiConstructorSpy).not.toHaveBeenCalled();

      void promise;
    });

    it('calls OpenAI SDK when provider is openai', async () => {
      openaiCreateMock.mockResolvedValueOnce({
        choices: [{ finish_reason: 'stop', message: { content: 'Hello!' } }],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({ provider: 'openai', model: 'gpt-4o' }),
      );

      await waitForQuestion();
      feedInput('hi');
      await waitForQuestion();

      expect(openaiConstructorSpy).toHaveBeenCalled();
      expect(openaiCreateMock).toHaveBeenCalled();

      void promise;
    });
  });

  // =========================================================================
  // 2. Anthropic path — correct parameters
  // =========================================================================

  describe('Anthropic path', () => {
    it('passes correct model, system, max_tokens, temperature, and tools', async () => {
      anthropicCreateMock.mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Response.' }],
      });

      const { runAgent } = await import('../agent-runner.js');

      const config = baseConfig({
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        instructions: 'Be concise.',
        tools: [
          {
            name: 'search',
            description: 'Search the web',
            inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
          },
        ],
        settings: { temperature: 0.5, max_tokens: 2048 },
      });

      const promise = runAgent(config);

      await waitForQuestion();
      feedInput('hello');
      await waitForQuestion();

      expect(anthropicCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          system: 'Be concise.',
          max_tokens: 2048,
          temperature: 0.5,
          tools: [
            {
              name: 'search',
              description: 'Search the web',
              input_schema: {
                type: 'object',
                properties: { query: { type: 'string' } },
              },
            },
          ],
        }),
      );

      void promise;
    });

    it('uses default max_tokens of 4096 when no settings provided', async () => {
      anthropicCreateMock.mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Response.' }],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({ provider: 'anthropic', settings: undefined }),
      );

      await waitForQuestion();
      feedInput('hello');
      await waitForQuestion();

      expect(anthropicCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 4096,
        }),
      );

      void promise;
    });

    it('omits temperature from API call when not specified in settings', async () => {
      anthropicCreateMock.mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hi.' }],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({ provider: 'anthropic', settings: { max_tokens: 1024 } }),
      );

      await waitForQuestion();
      feedInput('hello');
      await waitForQuestion();

      const callArgs = anthropicCreateMock.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('temperature');
      expect(callArgs.max_tokens).toBe(1024);

      void promise;
    });

    it('omits tools when tools array is empty', async () => {
      anthropicCreateMock.mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hi.' }],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({ provider: 'anthropic', tools: [] }),
      );

      await waitForQuestion();
      feedInput('hello');
      await waitForQuestion();

      const callArgs = anthropicCreateMock.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('tools');

      void promise;
    });
  });

  // =========================================================================
  // 3. OpenAI path — correct parameters
  // =========================================================================

  describe('OpenAI path', () => {
    it('passes correct model, messages with system, tools, max_tokens, temperature', async () => {
      openaiCreateMock.mockResolvedValueOnce({
        choices: [
          { finish_reason: 'stop', message: { content: 'Done.' } },
        ],
      });

      const { runAgent } = await import('../agent-runner.js');

      const config = baseConfig({
        provider: 'openai',
        model: 'gpt-4o',
        instructions: 'Be concise.',
        tools: [
          {
            name: 'search',
            description: 'Search the web',
            inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
          },
        ],
        settings: { temperature: 0.7, max_tokens: 512 },
      });

      const promise = runAgent(config);

      await waitForQuestion();
      feedInput('hello');
      await waitForQuestion();

      expect(openaiCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          max_tokens: 512,
          temperature: 0.7,
          tools: [
            {
              type: 'function',
              function: {
                name: 'search',
                description: 'Search the web',
                parameters: { type: 'object', properties: { query: { type: 'string' } } },
              },
            },
          ],
        }),
      );

      // Verify system message is the first message
      const callArgs = openaiCreateMock.mock.calls[0][0];
      expect(callArgs.messages[0]).toEqual({
        role: 'system',
        content: 'Be concise.',
      });

      // Verify user message is present
      expect(callArgs.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'hello' }),
        ]),
      );

      void promise;
    });

    it('omits max_tokens and temperature when not specified', async () => {
      openaiCreateMock.mockResolvedValueOnce({
        choices: [
          { finish_reason: 'stop', message: { content: 'Hi.' } },
        ],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({ provider: 'openai', model: 'gpt-4o', settings: undefined }),
      );

      await waitForQuestion();
      feedInput('hello');
      await waitForQuestion();

      const callArgs = openaiCreateMock.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('max_tokens');
      expect(callArgs).not.toHaveProperty('temperature');

      void promise;
    });

    it('omits tools when tools array is empty', async () => {
      openaiCreateMock.mockResolvedValueOnce({
        choices: [
          { finish_reason: 'stop', message: { content: 'Hi.' } },
        ],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({ provider: 'openai', model: 'gpt-4o', tools: [] }),
      );

      await waitForQuestion();
      feedInput('hello');
      await waitForQuestion();

      const callArgs = openaiCreateMock.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('tools');

      void promise;
    });
  });

  // =========================================================================
  // 4. Anthropic tool-use loop limit
  // =========================================================================

  describe('Anthropic tool-use loop limit', () => {
    it('breaks after MAX_TOOL_ROUNDS (20) when stop_reason is always tool_use', async () => {
      const toolUseResponse = {
        stop_reason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'call_1', name: 'search', input: { q: 'test' } },
        ],
      };

      // Every call returns tool_use — the loop should still break at 20
      anthropicCreateMock.mockResolvedValue(toolUseResponse);

      const { runAgent } = await import('../agent-runner.js');

      const config = baseConfig({
        provider: 'anthropic',
        tools: [{ name: 'search', description: 'Search' }],
      });

      const promise = runAgent(config);

      await waitForQuestion();
      feedInput('search for something');

      // Wait for the tool loop to complete (needs more time for 21 async calls)
      await waitForQuestion(200);

      // 1 initial + 20 loop iterations = 21 total API calls
      expect(anthropicCreateMock).toHaveBeenCalledTimes(21);

      // Verify the loop limit message was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool-use loop limit reached'),
        20,
      );

      void promise;
    });
  });

  // =========================================================================
  // 5. OpenAI tool-use loop limit
  // =========================================================================

  describe('OpenAI tool-use loop limit', () => {
    it('breaks after MAX_TOOL_ROUNDS (20) when finish_reason is always tool_calls', async () => {
      const toolCallResponse = {
        choices: [
          {
            finish_reason: 'tool_calls',
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  function: { name: 'search', arguments: '{"q":"test"}' },
                },
              ],
            },
          },
        ],
      };

      openaiCreateMock.mockResolvedValue(toolCallResponse);

      const { runAgent } = await import('../agent-runner.js');

      const config = baseConfig({
        provider: 'openai',
        model: 'gpt-4o',
        tools: [{ name: 'search', description: 'Search' }],
      });

      const promise = runAgent(config);

      await waitForQuestion();
      feedInput('search for something');

      await waitForQuestion(200);

      // 1 initial + 20 loop iterations = 21 total
      expect(openaiCreateMock).toHaveBeenCalledTimes(21);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tool-use loop limit reached'),
        20,
      );

      void promise;
    });
  });

  // =========================================================================
  // 6. Settings forwarding
  // =========================================================================

  describe('settings forwarding', () => {
    it('forwards temperature and max_tokens to Anthropic', async () => {
      anthropicCreateMock.mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'OK' }],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({
          provider: 'anthropic',
          settings: { temperature: 0.9, max_tokens: 8192 },
        }),
      );

      await waitForQuestion();
      feedInput('hi');
      await waitForQuestion();

      const callArgs = anthropicCreateMock.mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.9);
      expect(callArgs.max_tokens).toBe(8192);

      void promise;
    });

    it('forwards temperature and max_tokens to OpenAI', async () => {
      openaiCreateMock.mockResolvedValueOnce({
        choices: [
          { finish_reason: 'stop', message: { content: 'OK' } },
        ],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({
          provider: 'openai',
          model: 'gpt-4o',
          settings: { temperature: 0.3, max_tokens: 256 },
        }),
      );

      await waitForQuestion();
      feedInput('hi');
      await waitForQuestion();

      const callArgs = openaiCreateMock.mock.calls[0][0];
      expect(callArgs.temperature).toBe(0.3);
      expect(callArgs.max_tokens).toBe(256);

      void promise;
    });
  });

  // =========================================================================
  // 7. Default max_tokens
  // =========================================================================

  describe('default max_tokens', () => {
    it('Anthropic uses 4096 when settings is undefined', async () => {
      anthropicCreateMock.mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello' }],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({ provider: 'anthropic', settings: undefined }),
      );

      await waitForQuestion();
      feedInput('test');
      await waitForQuestion();

      expect(anthropicCreateMock.mock.calls[0][0].max_tokens).toBe(4096);

      void promise;
    });

    it('Anthropic uses 4096 when settings.max_tokens is not provided', async () => {
      anthropicCreateMock.mockResolvedValueOnce({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hello' }],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({ provider: 'anthropic', settings: { temperature: 0.5 } }),
      );

      await waitForQuestion();
      feedInput('test');
      await waitForQuestion();

      expect(anthropicCreateMock.mock.calls[0][0].max_tokens).toBe(4096);

      void promise;
    });

    it('OpenAI omits max_tokens when settings is undefined', async () => {
      openaiCreateMock.mockResolvedValueOnce({
        choices: [
          { finish_reason: 'stop', message: { content: 'Hello' } },
        ],
      });

      const { runAgent } = await import('../agent-runner.js');

      const promise = runAgent(
        baseConfig({ provider: 'openai', model: 'gpt-4o', settings: undefined }),
      );

      await waitForQuestion();
      feedInput('test');
      await waitForQuestion();

      const callArgs = openaiCreateMock.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('max_tokens');

      void promise;
    });
  });

  // =========================================================================
  // 8. Missing SDK — helpful error
  //
  // These tests use vi.resetModules() which clears the module cache and all
  // mock registrations. They are placed last and each test fully restores
  // the mock state via reapplyAllMocks() in afterEach.
  // =========================================================================

  describe('missing SDK error', () => {
    afterEach(() => {
      // Restore module cache and mocks to a clean state for any subsequent tests
      vi.resetModules();
      reapplyAllMocks();
    });

    it('throws install instructions when Anthropic SDK import fails', async () => {
      vi.resetModules();
      reapplyAllMocks();

      // Override the SDK mock to throw (simulating missing package)
      vi.doMock('@anthropic-ai/sdk', () => {
        throw new Error('Cannot find module');
      });

      const { runAgent } = await import('../agent-runner.js');

      await expect(runAgent(baseConfig({ provider: 'anthropic' }))).rejects.toThrow(
        /Missing peer dependency: @anthropic-ai\/sdk/,
      );
    });

    it('includes npm install command in Anthropic SDK error', async () => {
      vi.resetModules();
      reapplyAllMocks();

      vi.doMock('@anthropic-ai/sdk', () => {
        throw new Error('Cannot find module');
      });

      const { runAgent } = await import('../agent-runner.js');

      await expect(runAgent(baseConfig({ provider: 'anthropic' }))).rejects.toThrow(
        /npm install @anthropic-ai\/sdk/,
      );
    });

    it('throws install instructions when OpenAI SDK import fails', async () => {
      vi.resetModules();
      reapplyAllMocks();

      vi.doMock('openai', () => {
        throw new Error('Cannot find module');
      });

      const { runAgent } = await import('../agent-runner.js');

      await expect(
        runAgent(baseConfig({ provider: 'openai', model: 'gpt-4o' })),
      ).rejects.toThrow(/Missing peer dependency: openai/);
    });

    it('includes npm install command in OpenAI SDK error', async () => {
      vi.resetModules();
      reapplyAllMocks();

      vi.doMock('openai', () => {
        throw new Error('Cannot find module');
      });

      const { runAgent } = await import('../agent-runner.js');

      await expect(
        runAgent(baseConfig({ provider: 'openai', model: 'gpt-4o' })),
      ).rejects.toThrow(/npm install openai/);
    });
  });
});
