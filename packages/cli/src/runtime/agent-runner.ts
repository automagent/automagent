import { createInterface } from 'node:readline';
import chalk from 'chalk';
import ora from 'ora';
import { mockToolResponse } from './tool-mocker.js';
import type { ToolCall } from './tool-mocker.js';

const MAX_TOOL_ROUNDS = 20;

export interface RunConfig {
  name: string;
  model: string;
  provider: 'anthropic' | 'openai';
  instructions: string;
  tools: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown>; annotations?: Record<string, unknown> }>;
  settings?: { temperature?: number; max_tokens?: number };
}

export async function runAgent(config: RunConfig): Promise<void> {
  if (config.provider === 'anthropic') {
    await runAnthropic(config);
  } else {
    await runOpenAI(config);
  }
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

async function runAnthropic(config: RunConfig): Promise<void> {
  let Anthropic: typeof import('@anthropic-ai/sdk').default;
  try {
    const mod = await import('@anthropic-ai/sdk');
    Anthropic = mod.default;
  } catch {
    throw new Error(
      'Missing peer dependency: @anthropic-ai/sdk\nInstall it with: npm install @anthropic-ai/sdk',
    );
  }

  const client = new Anthropic();

  type Tool = Parameters<typeof client.messages.create>[0]['tools'] extends
    | (infer T)[]
    | undefined
    ? T
    : never;

  const anthropicTools: Tool[] = config.tools.map((t) => ({
    name: t.name,
    description: t.description ?? '',
    input_schema: {
      type: 'object' as const,
      properties: (t.inputSchema?.['properties'] ?? {}) as Record<string, unknown>,
    },
  }));

  type AnthropicMessage = { role: 'user' | 'assistant'; content: string | AnthropicContent[] };
  type AnthropicContent =
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_result'; tool_use_id: string; content: string };

  const messages: AnthropicMessage[] = [];

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on('close', () => {
    console.log(chalk.dim('\nSession ended.'));
  });

  console.log(chalk.bold(`\nAgent: ${config.name}`));
  console.log(chalk.dim(`Model: ${config.model} (anthropic)\n`));
  console.log(chalk.dim('Type your message. Press Ctrl+C to exit.\n'));

  const prompt = (): void => {
    rl.question(chalk.green('you > '), async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        prompt();
        return;
      }

      messages.push({ role: 'user', content: trimmed });

      const spinner = ora({ text: 'Thinking...', color: 'cyan' }).start();

      try {
        let response = await client.messages.create({
          model: config.model,
          max_tokens: config.settings?.max_tokens ?? 4096,
          system: config.instructions,
          messages,
          ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
          ...(config.settings?.temperature !== undefined ? { temperature: config.settings.temperature } : {}),
        });

        // Handle tool-use loop
        let toolRounds = 0;
        while (response.stop_reason === 'tool_use') {
          if (++toolRounds > MAX_TOOL_ROUNDS) {
            console.log('\nTool-use loop limit reached (%d rounds). Stopping to prevent runaway API calls.', MAX_TOOL_ROUNDS);
            break;
          }
          spinner.text = 'Using tools...';

          const assistantContent = response.content as AnthropicContent[];
          messages.push({ role: 'assistant', content: assistantContent });

          const toolResults: AnthropicContent[] = [];
          for (const block of assistantContent) {
            if (block.type === 'tool_use') {
              const toolCall: ToolCall = { name: block.name, input: block.input };
              console.log(chalk.dim(`\n  [tool: ${block.name}]`));
              const result = mockToolResponse(toolCall);
              toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
            }
          }

          messages.push({ role: 'user', content: toolResults });

          response = await client.messages.create({
            model: config.model,
            max_tokens: config.settings?.max_tokens ?? 4096,
            system: config.instructions,
            messages,
            ...(anthropicTools.length > 0 ? { tools: anthropicTools } : {}),
            ...(config.settings?.temperature !== undefined ? { temperature: config.settings.temperature } : {}),
          });
        }

        spinner.stop();

        let text = '';
        for (const block of response.content) {
          if (block.type === 'text' && 'text' in block) {
            text += (text ? '\n' : '') + block.text;
          }
        }

        messages.push({ role: 'assistant', content: response.content as AnthropicContent[] });

        console.log(chalk.cyan(`${config.name} > `) + text + '\n');
      } catch (err) {
        spinner.stop();
        console.log(chalk.red('Error: ') + String(err) + '\n');
      }

      prompt();
    });
  };

  prompt();
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

async function runOpenAI(config: RunConfig): Promise<void> {
  let OpenAI: typeof import('openai').default;
  try {
    const mod = await import('openai');
    OpenAI = mod.default;
  } catch {
    throw new Error(
      'Missing peer dependency: openai\nInstall it with: npm install openai',
    );
  }

  const client = new OpenAI();

  type ChatCompletionMessageParam = Parameters<
    typeof client.chat.completions.create
  >[0]['messages'][number];

  const openaiTools = config.tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description ?? '',
      parameters: t.inputSchema ?? { type: 'object', properties: {} },
    },
  }));

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system' as const, content: config.instructions },
  ];

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on('close', () => {
    console.log(chalk.dim('\nSession ended.'));
  });

  console.log(chalk.bold(`\nAgent: ${config.name}`));
  console.log(chalk.dim(`Model: ${config.model} (openai)\n`));
  console.log(chalk.dim('Type your message. Press Ctrl+C to exit.\n'));

  const prompt = (): void => {
    rl.question(chalk.green('you > '), async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        prompt();
        return;
      }

      messages.push({ role: 'user' as const, content: trimmed });

      const spinner = ora({ text: 'Thinking...', color: 'cyan' }).start();

      try {
        let response = await client.chat.completions.create({
          model: config.model,
          messages,
          ...(openaiTools.length > 0 ? { tools: openaiTools } : {}),
          ...(config.settings?.max_tokens !== undefined ? { max_tokens: config.settings.max_tokens } : {}),
          ...(config.settings?.temperature !== undefined ? { temperature: config.settings.temperature } : {}),
        });

        let choice = response.choices[0];

        // Handle tool-call loop
        let toolRounds = 0;
        while (choice?.finish_reason === 'tool_calls' && choice.message.tool_calls) {
          if (++toolRounds > MAX_TOOL_ROUNDS) {
            console.log('\nTool-use loop limit reached (%d rounds). Stopping to prevent runaway API calls.', MAX_TOOL_ROUNDS);
            break;
          }
          spinner.text = 'Using tools...';

          messages.push({
            role: 'assistant' as const,
            content: choice.message.content,
            tool_calls: choice.message.tool_calls,
          });

          for (const call of choice.message.tool_calls) {
            let parsedInput: Record<string, unknown> = {};
            try {
              parsedInput = JSON.parse(call.function.arguments) as Record<string, unknown>;
            } catch {
              // keep empty object
            }

            const toolCall: ToolCall = { name: call.function.name, input: parsedInput };
            console.log(chalk.dim(`\n  [tool: ${call.function.name}]`));
            const result = mockToolResponse(toolCall);
            messages.push({ role: 'tool' as const, content: result, tool_call_id: call.id });
          }

          response = await client.chat.completions.create({
            model: config.model,
            messages,
            ...(openaiTools.length > 0 ? { tools: openaiTools } : {}),
            ...(config.settings?.max_tokens !== undefined ? { max_tokens: config.settings.max_tokens } : {}),
            ...(config.settings?.temperature !== undefined ? { temperature: config.settings.temperature } : {}),
          });

          choice = response.choices[0];
        }

        spinner.stop();

        const text = choice?.message?.content ?? '';
        messages.push({ role: 'assistant' as const, content: text });

        console.log(chalk.cyan(`${config.name} > `) + text + '\n');
      } catch (err) {
        spinner.stop();
        console.log(chalk.red('Error: ') + String(err) + '\n');
      }

      prompt();
    });
  };

  prompt();
}
