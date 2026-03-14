export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export function mockToolResponse(tool: ToolCall): string {
  return JSON.stringify({
    tool: tool.name,
    input: tool.input,
    result: 'Mock: this tool would execute in production',
  });
}
